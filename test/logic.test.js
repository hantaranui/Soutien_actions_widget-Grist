"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const LCSE = require("../src/logic.js");

describe("eur", () => {
  test("formate un montant en euros avec séparateur de milliers", () => {
    assert.equal(LCSE.eur(5000), "5 000 €");
  });

  test("gère zéro, null, undefined comme 0 €", () => {
    assert.equal(LCSE.eur(0), "0 €");
    assert.equal(LCSE.eur(null), "0 €");
    assert.equal(LCSE.eur(undefined), "0 €");
  });

  test("n'utilise pas d'espace fine insécable (copier-coller/affichage)", () => {
    assert.ok(!LCSE.eur(123456).includes(" "));
  });
});

describe("formatDateFr", () => {
  test("formate un timestamp Unix en date française longue", () => {
    // 2026-09-16T00:00:00Z
    assert.equal(LCSE.formatDateFr(1789516800), "16 septembre 2026");
  });

  test("retombe sur un libellé neutre pour null/undefined/false", () => {
    assert.equal(LCSE.formatDateFr(null), "Date à préciser");
    assert.equal(LCSE.formatDateFr(undefined), "Date à préciser");
    assert.equal(LCSE.formatDateFr(false), "Date à préciser");
  });
});

describe("unpackList", () => {
  test("dépile l'encodage Grist ['L', ...] des ChoiceList/RefList/Attachments", () => {
    assert.deepEqual(LCSE.unpackList(["L", "BRSA", "Jeunes"]), ["BRSA", "Jeunes"]);
  });

  test("laisse passer un tableau sans marqueur 'L'", () => {
    assert.deepEqual(LCSE.unpackList([1, 2, 3]), [1, 2, 3]);
  });

  test("renvoie [] pour une valeur non-tableau (null, texte, nombre)", () => {
    assert.deepEqual(LCSE.unpackList(null), []);
    assert.deepEqual(LCSE.unpackList(undefined), []);
    assert.deepEqual(LCSE.unpackList("texte"), []);
    assert.deepEqual(LCSE.unpackList(42), []);
  });
});

describe("uniqSorted", () => {
  test("déduplique et trie en respectant les accents français", () => {
    assert.deepEqual(
      LCSE.uniqSorted(["Éure", "Corrèze", "Ain", "Corrèze", "Ariège"]),
      ["Ain", "Ariège", "Corrèze", "Éure"]
    );
  });

  test("écarte les valeurs vides/falsy", () => {
    assert.deepEqual(LCSE.uniqSorted(["A", "", null, undefined, "B"]), ["A", "B"]);
  });
});

describe("filterOptionsByQuery", () => {
  const options = ["Toutes", "Nouvelle-Aquitaine", "Île-de-France", "Occitanie"];

  test("requête vide renvoie toutes les options", () => {
    assert.deepEqual(LCSE.filterOptionsByQuery(options, ""), options);
    assert.deepEqual(LCSE.filterOptionsByQuery(options, "   "), options);
  });

  test("filtre par sous-chaîne insensible à la casse", () => {
    assert.deepEqual(LCSE.filterOptionsByQuery(options, "occ"), ["Occitanie"]);
    assert.deepEqual(LCSE.filterOptionsByQuery(options, "FRANCE"), ["Île-de-France"]);
  });

  test("aucune correspondance -> tableau vide", () => {
    assert.deepEqual(LCSE.filterOptionsByQuery(options, "zzz"), []);
  });
});

describe("rowsFromColumnTable / indexById", () => {
  test("convertit une table en colonnes (format fetchTable) en lignes", () => {
    const table = { id: [1, 2], Nom: ["Alice", "Bob"], Age: [30, 40] };
    assert.deepEqual(LCSE.rowsFromColumnTable(table), [
      { id: 1, Nom: "Alice", Age: 30 },
      { id: 2, Nom: "Bob", Age: 40 },
    ]);
  });

  test("indexById construit une Map id -> ligne", () => {
    const rows = [{ id: 5, Nom: "X" }, { id: 9, Nom: "Y" }];
    const map = LCSE.indexById(rows);
    assert.equal(map.get(5).Nom, "X");
    assert.equal(map.get(9).Nom, "Y");
    assert.equal(map.size, 2);
  });
});

describe("photoUrlFor", () => {
  const token = { baseUrl: "https://grist.aucarre.tech/api/docs/DOC", token: "abc123" };

  test("construit l'URL de téléchargement depuis Structures.Logo", () => {
    const structure = { Logo: ["L", 42] };
    assert.equal(
      LCSE.photoUrlFor(structure, token),
      "https://grist.aucarre.tech/api/docs/DOC/attachments/42/download?auth=abc123"
    );
  });

  test("renvoie null sans structure, sans token, ou sans logo attaché", () => {
    assert.equal(LCSE.photoUrlFor(null, token), null);
    assert.equal(LCSE.photoUrlFor({ Logo: ["L", 42] }, null), null);
    assert.equal(LCSE.photoUrlFor({ Logo: ["L"] }, token), null);
    assert.equal(LCSE.photoUrlFor({ Logo: null }, token), null);
  });

  test("Logo_url est prioritaire et fonctionne sans jeton d'accès", () => {
    const url = "https://exemple.fr/logo.png";
    // Sans jeton : la pièce jointe est inutilisable, l'adresse suffit.
    assert.equal(LCSE.photoUrlFor({ Logo_url: url, Logo: null }, null), url);
    // Avec une pièce jointe aussi disponible, l'adresse passe devant.
    assert.equal(LCSE.photoUrlFor({ Logo_url: url, Logo: ["L", 42] }, token), url);
    // Espaces superflus tolérés.
    assert.equal(LCSE.photoUrlFor({ Logo_url: "  " + url + "  " }, null), url);
  });

  test("Logo_url vide ou non http(s) est ignorée (anti-injection)", () => {
    const attach = "https://grist.aucarre.tech/api/docs/DOC/attachments/42/download?auth=abc123";
    assert.equal(LCSE.photoUrlFor({ Logo_url: "", Logo: ["L", 42] }, token), attach);
    assert.equal(LCSE.photoUrlFor({ Logo_url: "javascript:alert(1)", Logo: ["L", 42] }, token), attach);
    assert.equal(LCSE.photoUrlFor({ Logo_url: "data:image/png;base64,AAAA" }, null), null);
    assert.equal(LCSE.photoUrlFor({ Logo_url: "pas une adresse" }, null), null);
  });

  // Sur la page publique le visiteur est anonyme : getAccessToken n'aboutit
  // pas, et seule la clé de lien de l'URL autorise le téléchargement.
  test("la clé de lien autorise le téléchargement sans jeton", () => {
    const access = { baseUrl: "https://grist.aucarre.tech/api/docs/DOC", linkKey: "lcse-soutien" };
    assert.equal(
      LCSE.photoUrlFor({ Logo: ["L", 42] }, access),
      "https://grist.aucarre.tech/api/docs/DOC/attachments/42/download?pp_=lcse-soutien"
    );
  });

  test("la clé de lien passe devant le jeton quand les deux sont là", () => {
    const access = { baseUrl: "https://g/api/docs/DOC", linkKey: "k", token: "abc123" };
    assert.equal(
      LCSE.photoUrlFor({ Logo: ["L", 7] }, access),
      "https://g/api/docs/DOC/attachments/7/download?pp_=k"
    );
  });

  test("la clé est encodée (elle vient de la configuration, pas de la donnée)", () => {
    const access = { baseUrl: "https://g/api/docs/DOC", linkKey: "a b&c" };
    assert.equal(
      LCSE.photoUrlFor({ Logo: ["L", 1] }, access),
      "https://g/api/docs/DOC/attachments/1/download?pp_=a%20b%26c"
    );
  });

  test("sans baseUrl, ou sans clé ni jeton, on retombe sur le placeholder", () => {
    assert.equal(LCSE.photoUrlFor({ Logo: ["L", 42] }, { linkKey: "k" }), null);
    assert.equal(LCSE.photoUrlFor({ Logo: ["L", 42] }, { baseUrl: "https://g/api/docs/DOC" }), null);
  });
});

describe("buildActions", () => {
  // Fixture minimale au format grist.docApi.fetchTable (colonnes), avec :
  //  - une action correctement référencée et partiellement financée (id 1)
  //  - une action financée à 100% pile (id 2) -> doit être exclue
  //  - une action sans aucune référence renseignée (id 3) -> labels de repli
  function fixtureTables() {
    return {
      actionsT: {
        id: [1, 2, 3],
        Intitule: ["Du stade vers l'emploi", "Match des métiers", ""],
        Club: [10, 10, 0],
        Agence: [20, 20, 0],
        Federation: [30, 30, 0],
        DR: [40, 40, 0],
        DD: [50, 50, 0],
        Budget: [2000, 1500, 1000],
        Jauge: [42, 0, null],
        Public: [["L", "BRSA", "Jeunes"], ["L"], null],
        // Dates en désordre décroissant dans la table : l'action 1 est la
        // plus tardive, la 2 la plus proche, la 3 n'a pas de date.
        Date: [1789516800, 1789084800, null],
        Statut: ["Planifiée", "Planifiée", "A confirmer"],
        Periode_approx: ["", "", ""],
      },
      drT: { id: [40], Nom: ["Nouvelle-Aquitaine"] },
      ddT: { id: [50], Nom: ["DD Corrèze"] },
      agencesT: { id: [20], Libelle_agence: ["BRIVE LA MARQUISIE"] },
      structuresT: { id: [10], Nom: ["CA BRIVE"], Logo: [["L", 99]] },
      federationsT: { id: [30], Nom: ["Fédération française Rugby"] },
      cofinT: {
        id: [100, 101],
        Action: [1, 2],
        Montant: [500, 1500], // action 1: 500/2000=25% ; action 2: 1500/1500=100%
      },
    };
  }

  test("résout les références et calcule la jauge de financement", () => {
    const actions = LCSE.buildActions(fixtureTables(), null);
    const a1 = actions.find((a) => a.id === 1);
    assert.ok(a1, "l'action 1 (financée à 25%) doit être présente");
    assert.equal(a1.clubLabel, "CA BRIVE");
    assert.equal(a1.villeLabel, "BRIVE LA MARQUISIE");
    assert.equal(a1.federationLabel, "Fédération française Rugby");
    assert.equal(a1.regionLabel, "Nouvelle-Aquitaine");
    assert.equal(a1.deptLabel, "DD Corrèze");
    assert.equal(a1.pct, 25);
    assert.equal(a1.collecte, 500);
    assert.equal(a1.budget, 2000);
    assert.equal(a1.participantsLabel, "42 participants");
    assert.equal(a1.publicLabel, "BRSA, Jeunes");
    assert.equal(a1.dateLabel, "16 septembre 2026"); // Statut "Planifiée" -> Date exacte
  });

  test("conserve une action financée à 100% et la marque `financee`", () => {
    // Ancienne règle : ces actions étaient écartées. Le client a demandé de
    // les montrer dans un onglet séparé, donc buildActions les garde.
    const actions = LCSE.buildActions(fixtureTables(), null);
    const a2 = actions.find((a) => a.id === 2);
    assert.ok(a2, "l'action financée à 100% doit être présente");
    assert.equal(a2.pct, 100);
    assert.equal(a2.financee, true);
  });

  test("une action partiellement financée n'est pas marquée `financee`", () => {
    const actions = LCSE.buildActions(fixtureTables(), null);
    assert.equal(actions.find((a) => a.id === 1).financee, false);
  });

  test("renvoie les actions triées par date croissante, sans date à la fin", () => {
    const actions = LCSE.buildActions(fixtureTables(), null);
    // Table dans l'ordre 1, 2, 3 ; dates : 1 = 16/09, 2 = 11/09, 3 = aucune.
    assert.deepEqual(actions.map((a) => a.id), [2, 1, 3]);
    assert.equal(actions[0].dateLabel, "11 septembre 2026");
    assert.equal(actions[1].dateLabel, "16 septembre 2026");
    assert.equal(actions[2].dateTs, null);
  });

  test("retombe sur des libellés de repli quand les références sont vides", () => {
    const actions = LCSE.buildActions(fixtureTables(), null);
    const a3 = actions.find((a) => a.id === 3);
    assert.ok(a3);
    assert.equal(a3.intitule, "(sans titre)");
    assert.equal(a3.clubLabel, "Club non renseigné");
    assert.equal(a3.villeLabel, "Non précisée");
    assert.equal(a3.federationLabel, "Non précisée");
    assert.equal(a3.participantsLabel, "Non précisé");
    assert.equal(a3.publicLabel, "Non précisé");
    // budget 1000, aucun cofinancement lié -> 0%, donc pas exclue
    assert.equal(a3.pct, 0);
    // Statut "A confirmer" avec Periode_approx vide -> repli générique
    assert.equal(a3.dateLabel, "Date à préciser");
  });

  test("construit le lien du logo à partir de Structures.Logo quand un token est fourni", () => {
    const token = { baseUrl: "https://grist.example/api/docs/DOC", token: "tok" };
    const actions = LCSE.buildActions(fixtureTables(), token);
    const a1 = actions.find((a) => a.id === 1);
    assert.equal(a1.photoUrl, "https://grist.example/api/docs/DOC/attachments/99/download?auth=tok");
  });

  test("budget à 0 sans cofinancement reste à 0% (pas de division par zéro)", () => {
    const tables = fixtureTables();
    tables.actionsT.Budget = [0, 1500, 1000];
    tables.cofinT = { id: [], Action: [], Montant: [] }; // aucun cofinancement du tout
    const actions = LCSE.buildActions(tables, null);
    const a1 = actions.find((a) => a.id === 1);
    assert.ok(a1, "budget 0 sans cofinancement ne doit pas être exclue à tort");
    assert.equal(a1.pct, 0);
    assert.equal(a1.collecte, 0);
  });

  test("statut 'A confirmer' avec Periode_approx renseignée -> affiche ce texte libre", () => {
    const tables = fixtureTables();
    tables.actionsT.Statut = ["A confirmer", "Planifiée", "A confirmer"];
    tables.actionsT.Periode_approx = ["Courant octobre 2026", "", ""];
    const actions = LCSE.buildActions(tables, null);
    const a1 = actions.find((a) => a.id === 1);
    assert.equal(a1.dateLabel, "Courant octobre 2026");
  });

  test("statut 'Planifiée' sans Date -> repli 'Date à préciser'", () => {
    const tables = fixtureTables();
    tables.actionsT.Statut = ["Planifiée", "Planifiée", "A confirmer"];
    tables.actionsT.Date = [null, null, null];
    const actions = LCSE.buildActions(tables, null);
    const a1 = actions.find((a) => a.id === 1);
    assert.equal(a1.dateLabel, "Date à préciser");
  });

  test("statuts 'Réalisée' et 'Annulée' -> l'action n'apparaît plus du tout", () => {
    const tables = fixtureTables();
    // Budget/cofinancement à 0% pour ne pas se faire exclure par cette autre règle.
    tables.cofinT = { id: [], Action: [], Montant: [] };
    tables.actionsT.Statut = ["Réalisée", "Annulée", "A confirmer"];
    const actions = LCSE.buildActions(tables, null);
    assert.equal(actions.find((a) => a.id === 1), undefined, "Réalisée doit être exclue");
    assert.equal(actions.find((a) => a.id === 2), undefined, "Annulée doit être exclue");
    assert.ok(actions.find((a) => a.id === 3), "A confirmer doit rester visible");
  });
});

describe("getFilterOptions", () => {
  const actions = [
    { regionLabel: "Nouvelle-Aquitaine", deptLabel: "DD Corrèze", federationLabel: "Rugby", clubLabel: "CA Brive" },
    { regionLabel: "Nouvelle-Aquitaine", deptLabel: "DD Gironde", federationLabel: "Tennis", clubLabel: "US Bordeaux" },
    { regionLabel: "Île-de-France", deptLabel: "DD Paris", federationLabel: "Rugby", clubLabel: "PUC Rugby" },
  ];

  test("liste toutes les régions, préfixées par 'Toutes' et triées", () => {
    const opts = LCSE.getFilterOptions(actions, { region: LCSE.ALL });
    assert.deepEqual(opts.region, ["Toutes", "Île-de-France", "Nouvelle-Aquitaine"]);
  });

  test("le département est restreint à la région sélectionnée", () => {
    const opts = LCSE.getFilterOptions(actions, { region: "Nouvelle-Aquitaine" });
    assert.deepEqual(opts.dept, ["Toutes", "DD Corrèze", "DD Gironde"]);
  });

  test("fédération et club restent globaux, même avec une région sélectionnée", () => {
    const opts = LCSE.getFilterOptions(actions, { region: "Nouvelle-Aquitaine" });
    assert.ok(opts.fede.includes("Rugby") && opts.fede.includes("Tennis"));
    assert.ok(opts.club.includes("PUC Rugby"), "club d'une autre région toujours listé");
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 60 }, (_, i) => ({ id: i + 1 }));

  test("ne rend que le premier lot et annonce le reste", () => {
    const p = LCSE.paginate(list, LCSE.PAGE_SIZE);
    assert.equal(LCSE.PAGE_SIZE, 24);
    assert.equal(p.page.length, 24);
    assert.equal(p.page[0].id, 1);
    assert.equal(p.shown, 24);
    assert.equal(p.total, 60);
    assert.equal(p.remaining, 36);
    assert.equal(p.nextBatch, 24);
  });

  test("les lots sont cumulatifs : le second affichage garde les 24 premières", () => {
    const p = LCSE.paginate(list, 48);
    assert.equal(p.page.length, 48);
    assert.equal(p.page[0].id, 1);
    assert.equal(p.page[47].id, 48);
    assert.equal(p.remaining, 12);
    // Dernier lot incomplet : on n'annonce que ce qui reste.
    assert.equal(p.nextBatch, 12);
  });

  test("liste plus courte qu'un lot : tout est affiché, plus rien à charger", () => {
    const p = LCSE.paginate(list.slice(0, 10), LCSE.PAGE_SIZE);
    assert.equal(p.page.length, 10);
    assert.equal(p.remaining, 0);
    assert.equal(p.nextBatch, 0);
  });

  test("un compteur au-delà du total ne déborde pas", () => {
    const p = LCSE.paginate(list, 500);
    assert.equal(p.page.length, 60);
    assert.equal(p.shown, 60);
    assert.equal(p.remaining, 0);
  });

  test("liste vide", () => {
    const p = LCSE.paginate([], LCSE.PAGE_SIZE);
    assert.deepEqual(p.page, []);
    assert.equal(p.total, 0);
    assert.equal(p.remaining, 0);
  });
});

describe("actionsForTab", () => {
  const actions = [
    { id: 1, financee: false },
    { id: 2, financee: true },
    { id: 3, financee: false },
    { id: 4, financee: true },
  ];

  test("l'onglet à soutenir ne garde que les actions non financées", () => {
    const list = LCSE.actionsForTab(actions, LCSE.TAB_OPEN);
    assert.deepEqual(list.map((a) => a.id), [1, 3]);
  });

  test("l'onglet des financées ne garde que celles à 100%", () => {
    const list = LCSE.actionsForTab(actions, LCSE.TAB_FUNDED);
    assert.deepEqual(list.map((a) => a.id), [2, 4]);
  });

  test("les deux onglets sont complémentaires : aucune action perdue ni en double", () => {
    const a = LCSE.actionsForTab(actions, LCSE.TAB_OPEN).length;
    const b = LCSE.actionsForTab(actions, LCSE.TAB_FUNDED).length;
    assert.equal(a + b, actions.length);
  });

  test("une action sans champ financee compte comme à soutenir", () => {
    // Robustesse : `financee` absent (undefined) ne doit pas faire
    // disparaître l'action des deux onglets.
    const list = LCSE.actionsForTab([{ id: 9 }], LCSE.TAB_OPEN);
    assert.deepEqual(list.map((a) => a.id), [9]);
  });
});

describe("countLabelFor", () => {
  test("onglet à soutenir : accord en nombre", () => {
    assert.equal(LCSE.countLabelFor(LCSE.TAB_OPEN, 0), "Aucune action ouverte au soutien");
    assert.equal(LCSE.countLabelFor(LCSE.TAB_OPEN, 1), "1 action ouverte au soutien");
    assert.equal(LCSE.countLabelFor(LCSE.TAB_OPEN, 7), "7 actions ouvertes au soutien");
  });

  test("onglet des financées : formulation adaptée", () => {
    assert.equal(LCSE.countLabelFor(LCSE.TAB_FUNDED, 0), "Aucune action financée à 100 %");
    assert.equal(LCSE.countLabelFor(LCSE.TAB_FUNDED, 1), "1 action financée à 100 %");
    assert.equal(LCSE.countLabelFor(LCSE.TAB_FUNDED, 7), "7 actions financées à 100 %");
  });
});

describe("TABS", () => {
  test("deux onglets, celui à soutenir en premier (onglet d'arrivée)", () => {
    assert.equal(LCSE.TABS.length, 2);
    assert.equal(LCSE.TABS[0].key, LCSE.TAB_OPEN);
    assert.equal(LCSE.TABS[0].label, "Actions à soutenir");
    assert.equal(LCSE.TABS[1].key, LCSE.TAB_FUNDED);
    assert.equal(LCSE.TABS[1].label, "Actions déjà financées");
  });
});

describe("sortByDateAsc", () => {
  const JAN = 1767225600;  // 1er janvier 2026
  const FEB = 1769904000;  // 1er février 2026
  const MAR = 1772323200;  // 1er mars 2026

  test("ordonne du plus proche au plus lointain", () => {
    const list = LCSE.sortByDateAsc([
      { id: 1, dateTs: MAR },
      { id: 2, dateTs: JAN },
      { id: 3, dateTs: FEB },
    ]);
    assert.deepEqual(list.map((a) => a.id), [2, 3, 1]);
  });

  test("les actions sans date connue vont à la fin", () => {
    const list = LCSE.sortByDateAsc([
      { id: 1, dateTs: null },
      { id: 2, dateTs: FEB },
      { id: 3, dateTs: null },
      { id: 4, dateTs: JAN },
    ]);
    assert.deepEqual(list.map((a) => a.id), [4, 2, 1, 3]);
  });

  test("à date égale, l'ordre reste déterministe (par id)", () => {
    const list = LCSE.sortByDateAsc([
      { id: 9, dateTs: JAN },
      { id: 4, dateTs: JAN },
      { id: 7, dateTs: JAN },
    ]);
    assert.deepEqual(list.map((a) => a.id), [4, 7, 9]);
  });

  test("ne modifie pas le tableau reçu", () => {
    const input = [{ id: 1, dateTs: MAR }, { id: 2, dateTs: JAN }];
    LCSE.sortByDateAsc(input);
    assert.deepEqual(input.map((a) => a.id), [1, 2], "l'entrée doit être intacte");
  });

  test("liste vide", () => {
    assert.deepEqual(LCSE.sortByDateAsc([]), []);
  });
});
