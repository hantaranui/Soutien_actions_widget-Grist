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

  // Les deux onglets. TAB_OPEN est celui d'arrivée : c'est la raison d'être
  // du widget (trouver une action à cofinancer) ; TAB_FUNDED sert à montrer
  // ce qui a abouti, sans polluer la liste utile.
  const TAB_OPEN = "a-soutenir";
  const TAB_FUNDED = "financees";
  const TABS = [
    { key: TAB_OPEN, label: "Actions à soutenir" },
    { key: TAB_FUNDED, label: "Actions déjà financées" },
  ];

  // Nombre d'actions affichées d'emblée, et taille de chaque lot ajouté
  // ensuite par le bouton « Charger 24 actions de plus ». Toutes les
  // actions restent chargées en mémoire : on ne limite que ce qui est
  // effectivement rendu dans le DOM (et donc les logos à télécharger),
  // ce qui est le poste de coût réel à l'affichage.
  const PAGE_SIZE = 24;

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

  // Seules ces adresses sont acceptées comme logo : on refuse notamment les
  // "javascript:" et "data:" qui pourraient être injectés via la donnée.
  function isSafeImageUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  /**
   * Adresse du logo d'un club, par ordre de préférence :
   *  1. la colonne texte `Logo_url` de Structures — une simple adresse
   *     d'image, qui ne dépend d'aucun jeton ni permission et fonctionne
   *     donc sur n'importe quelle instance Grist ;
   *  2. à défaut, la pièce jointe `Logo`, qui exige un jeton d'accès
   *     (grist.docApi.getAccessToken) — indisponible sur certaines
   *     instances, auquel cas attachToken vaut null et on renvoie null.
   */
  function photoUrlFor(structure, attachToken) {
    if (!structure) return null;

    const url = structure.Logo_url;
    if (isSafeImageUrl(url)) return String(url).trim();

    if (!attachToken) return null;
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
   * Seul le statut retire une action du résultat : "Réalisée" ou "Annulée".
   * Les actions financées à 100 % sont conservées et marquées `financee`,
   * pour alimenter l'onglet "Actions déjà financées" — elles étaient
   * auparavant écartées d'office, avant que le client demande de les
   * montrer à part plutôt que de les masquer.
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
          financee: pct >= 100,
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
      // Une action Réalisée ou Annulée n'a plus rien à faire dans le widget,
      // quel que soit son financement.
      .filter((a) => !HIDDEN_STATUTS.has(a.statut));
  }

  /**
   * Découpe la liste filtrée en une page cumulative : les `visibleCount`
   * premières actions. Fonction pure, indépendante du DOM.
   *
   * @param {Array} list actions déjà filtrées, dans l'ordre d'affichage.
   * @param {number} visibleCount nombre d'actions à afficher.
   * @param {number} [pageSize=PAGE_SIZE] taille du prochain lot.
   * @returns {{page:Array, shown:number, total:number, remaining:number, nextBatch:number}}
   */
  function paginate(list, visibleCount, pageSize) {
    const size = Number(pageSize) > 0 ? Number(pageSize) : PAGE_SIZE;
    const total = list.length;
    const shown = Math.max(0, Math.min(Number(visibleCount) || 0, total));
    const remaining = total - shown;
    return {
      page: list.slice(0, shown),
      shown,
      total,
      remaining,
      nextBatch: Math.min(size, remaining),
    };
  }

  // Répartit les actions selon l'onglet : financées à 100 % d'un côté,
  // toutes les autres de l'autre. Aucune action n'apparaît dans les deux.
  function actionsForTab(actions, tab) {
    const wantFunded = tab === TAB_FUNDED;
    return actions.filter((a) => !!a.financee === wantFunded);
  }

  // Le compteur au-dessus de la liste : la formulation dépend de l'onglet,
  // "ouverte au soutien" n'ayant aucun sens pour une action déjà financée.
  function countLabelFor(tab, n) {
    if (tab === TAB_FUNDED) {
      if (n === 0) return "Aucune action financée à 100 %";
      return n === 1 ? "1 action financée à 100 %" : `${n} actions financées à 100 %`;
    }
    if (n === 0) return "Aucune action ouverte au soutien";
    return n === 1 ? "1 action ouverte au soutien" : `${n} actions ouvertes au soutien`;
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
    PAGE_SIZE,
    TABS,
    TAB_OPEN,
    TAB_FUNDED,
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
    actionsForTab,
    countLabelFor,
    paginate,
    getFilterOptions,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.LCSE = Object.assign(root.LCSE || {}, api);
  }
})(typeof window !== "undefined" ? window : globalThis);
