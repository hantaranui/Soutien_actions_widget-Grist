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

  test("échappe le HTML injecté dans les champs texte (anti-XSS)", () => {
    const html = R.renderCard({ ...SAMPLE_ACTION, intitule: '<img src=x onerror=alert(1)>' });
    assert.ok(!html.includes("<img src=x"));
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  test("affiche un placeholder texte quand il n'y a pas de photo, une <img> sinon", () => {
    const withoutPhoto = R.renderCard(SAMPLE_ACTION);
    assert.match(withoutPhoto, />Photo</);

    const withPhoto = R.renderCard({ ...SAMPLE_ACTION, photoUrl: "https://example.com/logo.png" });
    assert.match(withPhoto, /<img src="https:\/\/example\.com\/logo\.png"/);
  });

  test("retombe sur le placeholder texte si l'image échoue à charger (pas d'icône cassée)", () => {
    const html = R.renderCard({ ...SAMPLE_ACTION, photoUrl: "https://example.com/logo.png" });
    assert.match(html, /onerror="this\.parentElement\.textContent='Photo'"/);
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
