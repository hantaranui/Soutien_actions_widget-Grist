#!/usr/bin/env node
"use strict";

/*
 * Assemble index.html (le "dev" — plusieurs fichiers, pratique pour
 * déboguer avec de vrais numéros de ligne) en un unique dist/index.html :
 * le seul fichier à donner à Grist comme URL de widget personnalisé, et
 * celui à publier sur GitHub Pages / tout autre hébergeur statique.
 *
 * Les liens vers les CDN externes (Design System France Travail, API
 * widget Grist) restent volontairement des <link>/<script src> externes —
 * on ne les rapatrie pas dans le fichier : ce sont les CDN de France
 * Travail et de Grist, à jour indépendamment de ce widget.
 *
 * Pas de dépendance : juste du remplacement de texte entre des marqueurs
 * HTML (<!-- BUILD:CSS --> / <!-- BUILD:JS -->) posés dans index.html.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC_HTML = path.join(ROOT, "index.html");
const OUT_HTML = path.join(ROOT, "dist", "index.html");

function readBlock(html, marker) {
  const re = new RegExp(`<!-- BUILD:${marker} -->([\\s\\S]*?)<!-- /BUILD:${marker} -->`);
  const match = html.match(re);
  if (!match) throw new Error(`Marqueur <!-- BUILD:${marker} --> introuvable dans index.html`);
  return { match, inner: match[1] };
}

function replaceBlock(html, marker, replacement) {
  const { match } = readBlock(html, marker);
  return html.replace(match[0], replacement);
}

function build() {
  let html = fs.readFileSync(SRC_HTML, "utf8");

  const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
  html = replaceBlock(html, "CSS", `<style>\n${css}\n</style>`);

  const jsFiles = ["src/logic.js", "src/render.js", "src/main.js"];
  const js = jsFiles.map((f) => `/* ---- ${f} ---- */\n${fs.readFileSync(path.join(ROOT, f), "utf8")}`).join("\n\n");
  html = replaceBlock(html, "JS", `<script>\n${js}\n</script>`);

  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html, "utf8");

  const kb = (fs.statSync(OUT_HTML).size / 1024).toFixed(1);
  console.log(`Build OK -> ${path.relative(ROOT, OUT_HTML)} (${kb} kB)`);
}

build();
