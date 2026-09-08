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

  test("désactive le bouton d'envoi pendant la soumission", () => {
    const html = R.renderModal(SAMPLE_ACTION, { sent: false, submitting: true, submitError: "" });
    assert.match(html, /disabled/);
    assert.match(html, /Envoi…/);
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
