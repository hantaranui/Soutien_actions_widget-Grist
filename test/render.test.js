"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../src/render.js");

const SAMPLE_ACTION = {
  id: 42,
  dateLabel: "16 septembre 2026",
  intitule: "Du stade vers l'emploi",
  clubLabel: "CA Brive",
  villeLabel: "Brive-la-Gaillarde",
  federationLabel: "Fédération française Rugby",
  participantsLabel: "100 participants",
  publicLabel: "Non précisé",
  photoUrl: null,
  pct: 40,
  collecteLabel: "2 000 € cofinancés sur 5 000 €",
};

describe("renderCard", () => {
  test("affiche les champs de l'action et le bon id sur le bouton", () => {
    const html = R.renderCard(SAMPLE_ACTION);
    // L'apostrophe est échappée en HTML (&#39;) par escapeHtml — comportement voulu.
    assert.match(html, /Du stade vers l&#39;emploi/);
    assert.match(html, /CA Brive/);
    assert.match(html, /data-action="support" data-id="42"/);
    assert.match(html, /width:40%/);
  });

  test("bouton au libellé court, contexte conservé via aria-label", () => {
    const html = R.renderCard(SAMPLE_ACTION);
    assert.match(html, />Soutenir</, "libellé court, pour laisser la place à la jauge");
    assert.ok(!html.includes(">Soutenir cette action<"));
    assert.match(html, /aria-label="Soutenir cette action : Du stade vers l&#39;emploi"/);
  });

  test("échappe le HTML injecté dans les champs texte (anti-XSS)", () => {
    const html = R.renderCard({ ...SAMPLE_ACTION, intitule: '<img src=x onerror=alert(1)>' });
    assert.ok(!html.includes("<img src=x"));
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  test("sans logo : aucun cadre vide, le titre prend toute la largeur", () => {
    const withoutPhoto = R.renderCard(SAMPLE_ACTION);
    assert.ok(!withoutPhoto.includes("lcse-card-photo"));
    assert.ok(!withoutPhoto.includes(">Photo<"));
  });

  test("avec logo : une <img> dans son cadre", () => {
    const withPhoto = R.renderCard({ ...SAMPLE_ACTION, photoUrl: "https://example.com/logo.png" });
    assert.match(withPhoto, /class="lcse-card-photo"/);
    assert.match(withPhoto, /<img src="https:\/\/example\.com\/logo\.png"/);
  });

  test("si l'image échoue à charger, son cadre disparaît (pas d'icône cassée)", () => {
    const html = R.renderCard({ ...SAMPLE_ACTION, photoUrl: "https://example.com/logo.png" });
    assert.match(html, /onerror="this\.closest\('\.lcse-card-photo'\)\.remove\(\)"/);
  });
});

describe("comboOptionsHtml", () => {
  const options = ["Toutes", "Nouvelle-Aquitaine", "Occitanie"];

  test("liste toutes les options quand la requête est vide", () => {
    const html = R.comboOptionsHtml(options, "", "Toutes");
    assert.match(html, /Nouvelle-Aquitaine/);
    assert.match(html, /Occitanie/);
  });

  test("filtre selon la requête tapée", () => {
    const html = R.comboOptionsHtml(options, "occ", "Toutes");
    assert.match(html, /Occitanie/);
    assert.ok(!html.includes("Nouvelle-Aquitaine"));
  });

  test("affiche 'Aucun résultat' quand rien ne correspond", () => {
    const html = R.comboOptionsHtml(options, "zzz", "Toutes");
    assert.match(html, /Aucun résultat/);
  });

  test("marque l'option retenue avec is-selected", () => {
    const html = R.comboOptionsHtml(options, "", "Occitanie");
    assert.match(html, /class="lcse-combo-option is-selected">Occitanie</);
  });
});

describe("renderModal", () => {
  test("rend une modale masquée (hidden) quand aucune action n'est ouverte", () => {
    const html = R.renderModal(null, { sent: false, submitting: false, submitError: "" });
    assert.match(html, /hidden/);
    assert.ok(!html.includes("Soutenir une action"));
  });

  test("affiche le formulaire quand une action est ouverte et non envoyée", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: false, submitting: false, submitError: "" });
    assert.match(html, /Soutenir une action/);
    assert.match(html, /id="lcse-support-form"/);
  });

  test("affiche le message de confirmation une fois la demande envoyée", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: true, submitting: false, submitError: "" });
    assert.match(html, /Demande transmise/);
    assert.ok(!html.includes('id="lcse-support-form"'));
  });

  test("désactive le bouton d'envoi pendant la soumission, sans lui retirer le focus", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: false, submitting: true, submitError: "" });
    assert.match(html, /id="lcse-submit"[^>]*aria-disabled="true"/);
    assert.ok(!/id="lcse-submit"[^>]* disabled/.test(html), "pas d'attribut disabled, qui ferait perdre le focus");
    assert.match(html, /Envoi en cours<\/span><ft-spinner class="icon" label="Envoi en cours" size="xs">/);
  });

  test("dialogue accessible : rôle, aria-modal et titre relié", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: false, submitting: false, submitError: "" });
    assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="lcse-modal-title"/);
    assert.match(html, /<h2 class="modal-title" id="lcse-modal-title">Du stade vers l&#39;emploi<\/h2>/);
  });

  test("bouton de fermeture dans l'entête, sur le formulaire comme sur la confirmation", () => {
    for (const sent of [false, true]) {
      const html = R.renderModal(SAMPLE_ACTION, { sent, submitting: false, submitError: "" });
      assert.match(html, /class="modal-header lcse-modal-header"[\s\S]*?id="lcse-modal-close"[^>]*data-action="close"/);
      assert.match(html, /<span class="sr-only">Fermer la fenêtre<\/span>/);
    }
  });

  test("champs obligatoires marqués de l'astérisque du Design System", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: false, submitting: false, submitError: "" });
    for (const id of ["f-prenom", "f-nom", "f-organisation", "f-email"]) {
      assert.match(html, new RegExp(`for="${id}">[^<]*<span class="required">&nbsp;\\*</span>`));
    }
    for (const id of ["f-telephone", "f-montant", "f-message"]) {
      const label = html.match(new RegExp(`<label class="form-label" for="${id}">.*?</label>`))[0];
      assert.ok(!label.includes('class="required"'), `${id} est facultatif`);
    }
    assert.ok(!html.includes("(facultatif)"));
  });

  test("modale centrée, grand format", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: false, submitting: false, submitError: "" });
    assert.match(html, /class="modal lcse-modal show"/);
    assert.match(html, /modal-dialog-centered[^"]*modal-lg/);
  });
});

describe("renderLoadMore", () => {
  test("bouton et compteur quand il reste des actions à charger", () => {
    const html = R.renderLoadMore({ shown: 24, total: 60, remaining: 36, nextBatch: 24 });
    assert.match(html, /data-action="load-more"/);
    assert.match(html, /Charger 24 actions de plus/);
    assert.match(html, /24 actions affichées sur 60/);
  });

  test("rien du tout quand toutes les actions sont affichées", () => {
    assert.equal(R.renderLoadMore({ shown: 12, total: 12, remaining: 0, nextBatch: 0 }), "");
  });

  test("dernier lot : annonce le nombre réel restant, au singulier si besoin", () => {
    const html = R.renderLoadMore({ shown: 47, total: 48, remaining: 1, nextBatch: 1 });
    assert.match(html, /Charger 1 action de plus/);
  });
});

describe("renderTabs", () => {
  const TABS = [
    { key: "a-soutenir", label: "Actions à soutenir" },
    { key: "financees", label: "Actions déjà financées" },
  ];
  const counts = { "a-soutenir": 55, financees: 12 };

  test("affiche les deux onglets avec leur nombre d'actions", () => {
    const html = R.renderTabs(TABS, "a-soutenir", counts);
    assert.match(html, /Actions à soutenir \(55\)/);
    assert.match(html, /Actions déjà financées \(12\)/);
    assert.match(html, /role="tablist"/);
  });

  test("marque l'onglet actif, et lui seul", () => {
    const html = R.renderTabs(TABS, "a-soutenir", counts);
    // aria-current déclenche l'apparence active du Design System.
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    assert.match(html, /data-tab="a-soutenir"[\s\S]*?aria-selected="true"/);
    assert.match(html, /data-tab="financees"[\s\S]*?aria-selected="false"/);
  });

  test("l'onglet actif suit le paramètre", () => {
    const html = R.renderTabs(TABS, "financees", counts);
    assert.match(html, /data-tab="financees"[\s\S]*?aria-selected="true"[\s\S]*?aria-current="page"/);
    assert.match(html, /data-tab="a-soutenir"[\s\S]*?aria-selected="false"/);
  });

  test("un onglet vide affiche (0), pas une valeur absente", () => {
    const html = R.renderTabs(TABS, "a-soutenir", { "a-soutenir": 3 });
    assert.match(html, /Actions déjà financées \(0\)/);
  });
});

describe("renderCard sur une action déjà financée", () => {
  const FINANCEE = { ...SAMPLE_ACTION, financee: true, pct: 100, collecteLabel: "5 000 € cofinancés sur 5 000 €" };

  test("pas de bouton Soutenir, mais la mention du résultat", () => {
    const html = R.renderCard(FINANCEE);
    assert.ok(!html.includes('data-action="support"'), "aucun bouton de soutien");
    assert.match(html, /Financée à 100 %/);
  });

  test("la jauge reste affichée, à 100%", () => {
    const html = R.renderCard(FINANCEE);
    assert.match(html, /width:100%/);
    assert.match(html, /5 000 € cofinancés sur 5 000 €/);
  });

  test("une action non financée garde son bouton", () => {
    const html = R.renderCard({ ...SAMPLE_ACTION, financee: false });
    assert.match(html, /data-action="support"/);
    assert.ok(!html.includes("Financée à 100 %"));
  });
});

describe("formulaire de soutien : erreurs et aides", () => {
  const OPEN = { sent: false, submitting: false, submitError: "" };

  test("validation confiée au widget (novalidate), required conservé", () => {
    const html = R.renderModal(SAMPLE_ACTION, OPEN);
    assert.match(html, /<form id="lcse-support-form" novalidate>/);
    assert.match(html, /id="f-email"[^>]* required/);
  });

  test("sans erreur : aucun marquage d'erreur", () => {
    const html = R.renderModal(SAMPLE_ACTION, { ...OPEN, fieldErrors: {} });
    assert.ok(!html.includes("has-error"));
    assert.ok(!html.includes("aria-invalid"));
  });

  test("champ en erreur : motif Input · Erreur du Design System", () => {
    const html = R.renderModal(SAMPLE_ACTION, { ...OPEN, fieldErrors: { nom: "Renseignez votre nom." } });
    assert.match(html, /class="form-group has-error">\s*<label class="form-label" for="f-nom">/);
    assert.match(html, /id="f-nom"[^>]*class="form-control is-invalid"[^>]*aria-describedby="error-f-nom"[^>]*aria-invalid="true"/);
    assert.match(html, /<p class="help-block invalid-feedback" id="error-f-nom"><span class="sr-only">Erreur&nbsp;:&nbsp;<\/span>Renseignez votre nom\.<\/p>/);
  });

  test("champ avec aide et erreur : les deux sont reliés, l'erreur d'abord", () => {
    const html = R.renderModal(SAMPLE_ACTION, { ...OPEN, fieldErrors: { email: "Adresse invalide." } });
    assert.match(html, /id="f-email"[^>]*aria-describedby="error-f-email help-f-email"/);
    assert.match(html, /<p class="help-block" id="help-f-email">Exemple : nom@organisation\.fr<\/p>/);
  });

  test("le message d'erreur est échappé", () => {
    const html = R.renderModal(SAMPLE_ACTION, { ...OPEN, fieldErrors: { nom: "<b>x</b>" } });
    assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  });

  test("aides à la saisie à la place des placeholders", () => {
    const html = R.renderModal(SAMPLE_ACTION, OPEN);
    assert.ok(!html.includes("placeholder="));
    assert.match(html, /id="f-telephone"[^>]*aria-describedby="help-f-telephone"/);
    assert.match(html, /id="f-message"[^>]*aria-describedby="help-f-message"/);
  });

  test("montant : champ numérique texte avec l'unité accolée (Input · Append)", () => {
    const html = R.renderModal(SAMPLE_ACTION, OPEN);
    assert.match(html, /for="f-montant">Montant envisagé<span class="sr-only">&nbsp;en euros<\/span><\/label>/);
    assert.match(html, /id="f-montant"[^>]*type="text" inputmode="numeric"/);
    assert.match(html, /<div class="input-group-append" aria-hidden="true"><span class="input-group-text">€<\/span><\/div>/);
    assert.ok(!html.includes('type="number"'));
  });

  test("alerte d'échec d'envoi toujours présente, masquée et vide (remplie par main.js)", () => {
    for (const submitError of ["", "L'envoi a échoué."]) {
      const html = R.renderModal(SAMPLE_ACTION, { ...OPEN, submitError });
      assert.match(html, /id="lcse-submit-alert" role="alert" hidden>/);
      assert.match(html, /<p class="alert-content" id="lcse-submit-alert-text"><\/p>/);
    }
  });

  test("les champs rendus suivent l'ordre de validation", () => {
    const L = require("../src/logic.js");
    assert.deepEqual(R.SUPPORT_FORM_FIELDS.map((f) => f.name), L.SUPPORT_FIELDS);
  });
});
