#!/usr/bin/env node
"use strict";

/*
 * Serveur de développement, sans aucune dépendance.
 *
 * Pourquoi ne pas utiliser `python3 -m http.server` : il n'envoie ni
 * Cache-Control ni ETag, seulement Last-Modified. Une réponse sans
 * directive de fraîcheur peut être mise en cache "heuristiquement" par le
 * navigateur (RFC 9111 §4.2.2), qui ressert alors styles.css depuis son
 * cache sans interroger le serveur. Résultat : on modifie le CSS, le
 * serveur renvoie bien la nouvelle version à curl, mais la page continue
 * d'afficher l'ancienne — et un rechargement forcé de la page Grist ne
 * revalide pas forcément les sous-ressources de l'iframe du widget.
 *
 * Ce serveur envoie `Cache-Control: no-store` sur tout : chaque
 * rechargement relit le fichier sur le disque. Plus besoin de suffixer les
 * URLs (styles.css?v=2) à chaque changement.
 *
 * Usage : node dev-server.js [port]     (défaut : 8080)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    // La raison d'être de ce serveur.
    "Cache-Control": "no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  }, headers || {}));
  res.end(body);
}

/*
 * Anti-cache à toute épreuve : dans le HTML servi, on ajoute un paramètre
 * unique aux liens locaux (./styles.css -> ./styles.css?t=1757332…).
 *
 * `Cache-Control: no-store` empêche le navigateur de mettre en cache les
 * réponses à venir, mais ne supprime pas une entrée DÉJÀ présente : tant
 * qu'il la juge fraîche, il ne redemande rien au serveur et continue
 * d'afficher l'ancien CSS. Avec une URL différente à chaque chargement,
 * il n'y a jamais d'entrée correspondante, donc jamais d'ancien fichier.
 *
 * Le fichier sur le disque n'est pas modifié : seule la copie envoyée au
 * navigateur l'est. index.html reste donc propre pour le déploiement.
 */
function bustCache(html) {
  const token = Date.now().toString(36);
  return html.replace(
    /\b(href|src)="(\.\/[^"?#]+\.(?:css|js))"/g,
    (m, attr, url) => `${attr}="${url}?t=${token}"`
  );
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (e) {
    return send(res, 400, "Requête invalide", { "Content-Type": "text/plain; charset=utf-8" });
  }

  if (pathname.endsWith("/")) pathname += "index.html";

  // path.join normalise les ".." : on vérifie ensuite qu'on n'est pas
  // sorti de ROOT, pour ne pas servir n'importe quel fichier du disque.
  const filePath = path.join(ROOT, pathname);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    return send(res, 403, "Accès refusé", { "Content-Type": "text/plain; charset=utf-8" });
  }

  console.log(`${new Date().toLocaleTimeString("fr-FR")}  ${req.method} ${pathname}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const msg = `404 — ${pathname} introuvable\n\nÀ servir depuis ${ROOT} :\n  /       (le widget, index.html)\n  /dist/  (le fichier unique à déployer)\n`;
      return send(res, 404, msg, { "Content-Type": "text/plain; charset=utf-8" });
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || "application/octet-stream";
    const body = ext === ".html" ? bustCache(data.toString("utf8")) : data;
    send(res, 200, body, { "Content-Type": type });
  });
});

server.listen(PORT, () => {
  console.log(`Serveur de dev (sans cache) sur http://localhost:${PORT}/`);
  console.log(`  widget : http://localhost:${PORT}/`);
  console.log(`Racine : ${ROOT}`);
});
