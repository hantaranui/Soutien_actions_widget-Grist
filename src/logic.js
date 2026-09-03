/*
 * Logique pure du widget "Soutenez les clubs sportifs engagés" : formatage,
 * jointure des tables Grist, calcul des filtres. Aucune de ces fonctions ne
 * touche au DOM ni à `grist` — elles prennent des données en entrée et
 * renvoient des données en sortie, ce qui les rend testables sous Node
 * (voir test/logic.test.js) sans navigateur ni widget Grist réel.
 *
 * Chargé à la fois :
 *  - dans le navigateur, comme <script src="./src/logic.js"></script>
 *    classique (pas de module) : les fonctions sont exposées sur
 *    `window.LCSE`.
 *  - sous Node, via require("./logic.js") pour les tests : `module` existe
 *    alors et on exporte le même objet.
 */
(function (root) {
  "use strict";

  const ALL = "Toutes";

  const TABLES = {
    actions: "Actions",
    dr: "DR",
    dd: "DD",
    agences: "Agences",
    structures: "Structures",
    federations: "Federations",
    cofinancements: "Cofinancements",
    soutiens: "Soutiens",
  };

  const FILTER_KEYS = ["region", "dept", "fede", "club"];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // toLocaleString("fr-FR") sépare les milliers par une espace fine
  // insécable (U+202F), pas une espace normale : on la remplace par une
  // espace normale pour un rendu/copier-coller plus prévisible.
  function eur(n) {
    const num = Number(n) || 0;
    return num.toLocaleString("fr-FR").replace(/ /g, " ") + " €";
  }

  // Fuseau fixé à Europe/Paris : ces dates sont celles d'actions en France
  // et doivent s'afficher pareil pour tout le monde, quel que soit le
  // fuseau du navigateur du visiteur (ou de la machine qui exécute les
  // tests).
  function formatDateFr(ts) {
    if (ts === null || ts === undefined || ts === false) return "Date à préciser";
    const d = new Date(ts * 1000);
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(d);
  }

  // Grist encode les ChoiceList/RefList/Attachments en ["L", v1, v2, ...].
  function unpackList(value) {
    if (Array.isArray(value)) {
      return value[0] === "L" ? value.slice(1) : value;
    }
    return [];
  }

  function uniqSorted(values) {
    return Array.from(new Set(values.filter((v) => v))).sort((a, b) => a.localeCompare(b, "fr"));
  }

  function filterOptionsByQuery(options, query) {
    const q = String(query || "").trim().toLocaleLowerCase("fr-FR");
    if (!q) return options;
    return options.filter((o) => o.toLocaleLowerCase("fr-FR").includes(q));
  }

  // grist.docApi.fetchTable renvoie un objet en colonnes ({id:[...], Col:[...]}).
  // On le transforme en tableau de lignes {id, Col, ...}.
  function rowsFromColumnTable(table) {
    const ids = (table && table.id) || [];
    return ids.map((id, i) => {
      const row = { id };
      for (const col of Object.keys(table)) {
        if (col === "id") continue;
        row[col] = table[col][i];
      }
      return row;
    });
  }

  function indexById(rows) {
    const map = new Map();
    for (const r of rows) map.set(r.id, r);
    return map;
  }

  function photoUrlFor(structure, attachToken) {
    if (!structure || !attachToken) return null;
    const ids = unpackList(structure.Logo);
    if (!ids.length) return null;
    return `${attachToken.baseUrl}/attachments/${ids[0]}/download?auth=${attachToken.token}`;
  }

  // Statuts qui retirent une action du widget, quel que soit son financement.
  const HIDDEN_STATUTS = new Set(["Réalisée", "Annulée"]);

  // La date affichée dépend du statut : une date exacte n'a de sens que
  // pour une action "Planifiée" ; tant que c'est "A confirmer" (ou tout
  // autre statut), on affiche la période approximative en texte libre.
  function dateLabelFor(a) {
    if (a.Statut === "Planifiée") return formatDateFr(a.Date);
    const approx = a.Periode_approx && String(a.Periode_approx).trim();
    return approx || "Date à préciser";
  }

  /**
   * Assemble les tables brutes (au format colonnes de grist.docApi.fetchTable)
   * en une liste d'actions prêtes à l'affichage : résolution des références
   * (Club, Agence, Fédération, DR, DD), calcul de la jauge de financement à
   * partir de Cofinancements, et labels formatés en français.
   *
   * Règles métier qui retirent une action du résultat :
   *  - déjà financée à 100 % (collecte >= budget) ;
   *  - statut "Réalisée" ou "Annulée".
   *
   * @param {object} tables { actionsT, drT, ddT, agencesT, structuresT, federationsT, cofinT }
   *   — chacune au format renvoyé par grist.docApi.fetchTable.
   * @param {{baseUrl:string, token:string}|null} attachToken pour construire
   *   les URLs de téléchargement des logos (Structures.Logo), ou null si
   *   indisponible (les logos retombent alors sur le placeholder).
   */
  function buildActions(tables, attachToken) {
    const { actionsT, drT, ddT, agencesT, structuresT, federationsT, cofinT } = tables;

    const drMap = indexById(rowsFromColumnTable(drT));
    const ddMap = indexById(rowsFromColumnTable(ddT));
    const agenceMap = indexById(rowsFromColumnTable(agencesT));
    const structureMap = indexById(rowsFromColumnTable(structuresT));
    const federationMap = indexById(rowsFromColumnTable(federationsT));
    const cofinRows = rowsFromColumnTable(cofinT);

    const collecteByAction = new Map();
    for (const c of cofinRows) {
      if (!c.Action) continue;
      collecteByAction.set(c.Action, (collecteByAction.get(c.Action) || 0) + (Number(c.Montant) || 0));
    }

    const rawActions = rowsFromColumnTable(actionsT);

    return rawActions
      .map((a) => {
        const dr = a.DR ? drMap.get(a.DR) : null;
        const dd = a.DD ? ddMap.get(a.DD) : null;
        const agence = a.Agence ? agenceMap.get(a.Agence) : null;
        const structure = a.Club ? structureMap.get(a.Club) : null;
        const federation = a.Federation ? federationMap.get(a.Federation) : null;
        const budget = Number(a.Budget) || 0;
        const collecte = collecteByAction.get(a.id) || 0;
        const pct = budget > 0 ? Math.min(100, Math.round((collecte / budget) * 100)) : (collecte > 0 ? 100 : 0);
        const publicLabels = unpackList(a.Public);

        return {
          id: a.id,
          intitule: a.Intitule || "(sans titre)",
          statut: a.Statut || "",
          dateLabel: dateLabelFor(a),
          clubLabel: structure ? structure.Nom : "Club non renseigné",
          villeLabel: agence ? agence.Libelle_agence : "Non précisée",
          federationLabel: federation ? federation.Nom : "Non précisée",
          regionLabel: dr ? dr.Nom : "",
          deptLabel: dd ? dd.Nom : "",
          participantsLabel: (a.Jauge || a.Jauge === 0) ? (Number(a.Jauge).toLocaleString("fr-FR") + " participants") : "Non précisé",
          publicLabel: publicLabels.length ? publicLabels.join(", ") : "Non précisé",
          photoUrl: photoUrlFor(structure, attachToken),
          budget,
          collecte,
          pct,
          collecteLabel: eur(collecte) + " cofinancés sur " + eur(budget),
        };
      })
      // Une action déjà financée à 100 %, ou marquée Réalisée/Annulée,
      // n'est plus ouverte au soutien.
      .filter((a) => a.pct < 100 && !HIDDEN_STATUTS.has(a.statut));
  }

  // Options disponibles pour chaque filtre. Le département est limité à la
  // région choisie ; fédération et club restent globaux (comportement du
  // prototype d'origine, conservé tel quel).
  function getFilterOptions(actions, state) {
    const inRegion = state.region === ALL ? actions : actions.filter((a) => a.regionLabel === state.region);
    return {
      region: [ALL, ...uniqSorted(actions.map((a) => a.regionLabel))],
      dept: [ALL, ...uniqSorted(inRegion.map((a) => a.deptLabel))],
      fede: [ALL, ...uniqSorted(actions.map((a) => a.federationLabel))],
      club: [ALL, ...uniqSorted(actions.map((a) => a.clubLabel))],
    };
  }

  const api = {
    ALL,
    TABLES,
    FILTER_KEYS,
    escapeHtml,
    eur,
    formatDateFr,
    unpackList,
    uniqSorted,
    filterOptionsByQuery,
    rowsFromColumnTable,
    indexById,
    photoUrlFor,
    buildActions,
    getFilterOptions,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.LCSE = Object.assign(root.LCSE || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
