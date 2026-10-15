# Widget Grist « Soutenez les clubs sportifs engagés »

## À quoi il sert et qui l'utilise

Page publique du programme « Les clubs sportifs engagés » de France Travail. Elle liste les actions menées avec des clubs sportifs et permet à un visiteur (entreprise, partenaire, particulier) de proposer un soutien financier à une action. Les équipes France Travail alimentent les données dans Grist et reçoivent les propositions de soutien dans la table `Soutiens`.

Le widget est conçu pour une page publique Grist en lecture seule : le visiteur n'a pas de compte.

## Données lues

Les noms de tables et de colonnes sont écrits en dur : il n'y a **pas d'association de colonnes** à faire dans le panneau Grist. Les noms de tables sont centralisés dans `TABLES` de [src/logic.js](src/logic.js).

| Table | Colonnes lues |
| --- | --- |
| `Actions` | `Intitule`, `Statut`, `Date`, `Periode_approx`, `Ville`, `Jauge`, `Public`, `Budget`, `Ouvert_au_financement`, `Corbeille`, et les références `Club` (→ `Structures`), `Federation` (→ `Federations`), `DR` (→ `DR`), `DD` (→ `DD`) |
| `Structures` | `Nom`, `Logo` (pièce jointe) ; `Logo_url` (texte, facultatif, prioritaire sur `Logo`) |
| `Federations` | `Nom` |
| `DR` | `Nom` |
| `DD` | `Nom` |
| `Cofinancements` | `Action` (→ `Actions`), `Montant` |
| `Soutiens` | lue au chargement, mais seulement écrite ensuite (voir plus bas) |

Valeurs attendues :
- `Statut` : `Planifiée` (la date exacte `Date` est alors affichée) ou `A confirmer` (c'est `Periode_approx` qui est affichée). Les statuts `Réalisée` et `Annulée` retirent l'action du widget.
- `Corbeille` : case à cocher ; une action cochée n'apparaît nulle part (suppression logique).
- `Ouvert_au_financement` : case à cocher (ou texte « oui ») ; une action non ouverte n'apparaît pas dans l'onglet « à soutenir ».

## Ce qu'il affiche et calcule

- Deux onglets : « Actions à soutenir » (onglet d'arrivée) et « Actions déjà financées ».
- Filtres Région, Département, Fédération et Club (ce dernier avec recherche à la frappe), et compteur d'actions.
- Une carte par action : logo du club, intitulé, date ou période, ville, fédération, participants, public, et jauge de financement.
- Tri chronologique, affichage par lots de 24 actions.
- Calcul du financement : somme des `Cofinancements.Montant` par action, comparée à `Actions.Budget`. À 100 % ou plus, l'action passe dans « déjà financées ».
- Bouton « Partager » : copie le lien de la page publique.

## Ce qu'il écrit dans Grist

Un seul cas : l'envoi du formulaire de soutien ajoute une ligne dans `Soutiens` (`AddRecord`), avec les colonnes :

`Organisation`, `Prenom`, `Nom`, `Email`, `Telephone`, `Montant` (entier en euros, ou vide), `Message`, `Date` (horodatage), `Action_financee` (→ `Actions`).

Rien d'autre n'est modifié.

## Installation dans Grist

1. Adresse du widget : **https://hantaranui.github.io/Soutien_actions_widget-Grist/dist/** (GitHub Pages, branche `main`, fichier `dist/index.html`).
2. Dans le document Grist, ajouter un widget **Personnalisé** et y coller cette adresse.
3. Droits demandés : **accès complet** (`requiredAccess: "full"`). Le widget lit sept tables et écrit dans `Soutiens`.
4. Colonnes à associer : aucune (voir plus haut).
5. Pour la page publique, la table `Soutiens` doit accepter l'ajout de lignes par le visiteur anonyme. C'est à régler dans les règles d'accès du document.

Les adresses du document (identifiant, lien public de la page) sont définies en tête de [src/main.js](src/main.js) (`PUBLIC_PAGE_URL`, `ATTACHMENTS_BASE_URL`). Elles sont à changer si le document change.

Le Design System France Travail et l'API de widget Grist (`grist-plugin-api.js`) restent chargés depuis leur CDN, et ne sont pas copiés dans `dist/index.html`.

## Lancer en local

Pas de dépendance npm, il suffit de Node.

| Commande | Effet |
| --- | --- |
| `npm run dev` | Lance `dev-server.js` sur http://localhost:8080 (autre port : `node dev-server.js 3000`) |
| `npm run build` | Assemble `index.html`, `styles.css` et `src/*.js` en `dist/index.html` |
| `npm test` | Lance les tests (`node --test`) |
| `npm run dev:python` | Alternative avec `python3 -m http.server`, déconseillée (cache) |

Rôle de `dev-server.js` : c'est un serveur de fichiers statiques qui envoie `Cache-Control: no-store` partout. Sans cela, le navigateur peut ressservir un ancien `styles.css` depuis son cache, y compris dans l'iframe d'un widget Grist, et les modifications semblent ne pas s'appliquer.

Pour voir le widget dans Grist en cours de développement, ajouter un widget Personnalisé pointant sur `http://localhost:8080`.

`dist/index.html` est le fichier publié : le régénérer (`npm run build`) et le committer après chaque modification.

## Structure

```
index.html        Version de développement (plusieurs fichiers)
styles.css        Styles
src/logic.js      Logique pure : jointures, filtres, validation (testable sous Node)
src/render.js     Gabarits HTML
src/main.js       Câblage avec l'API Grist et le DOM, état
build.js          Génère dist/index.html
dev-server.js     Serveur de développement
dist/index.html   Fichier publié sur GitHub Pages
test/             Tests
```

## Logos des clubs

Grist ne retaille pas les images : le logo est affiché dans une vignette de 88 × 66 px mais téléchargé à sa taille d'origine. Avant de les déposer dans `Structures.Logo`, il faut donc les alléger :

```bash
./normaliser-logos.sh <dossier-source> [dossier-sortie]
```

Ce script se trouve dans le dossier parent du dépôt, et non dans `widget/`. Il convertit en WebP, limite la largeur à 250 px et ne modifie pas les originaux. Il fonctionne sous macOS (`sips`) et demande `cwebp` (`brew install webp`).

## Lien avec les autres dépôts

- **Code partagé : aucun.** Ce dépôt est autonome (pas de dépendance npm, pas de sous-module, pas de fichier importé d'un autre dépôt). Le dossier `Au_Carre` contient d'autres widgets Grist, comme `grist-qpv-widget` (vérification QPV, tableau de bord des actions, fiche club), avec la même organisation (`src/`, `build.js`, `dev-server.js`), mais chacun est copié, pas partagé.
- **Tables partagées : même document Grist.** Le widget lit le document « Partenariat Simplifié » ; les autres widgets du programme travaillent sur ce même document et donc sur les mêmes tables (`Actions`, `Structures`, etc.). Renommer une table ou une colonne dans Grist peut casser plusieurs widgets à la fois.
- Le modèle de données de référence est dans le dépôt `model-de-donnees-aucarre`.

## Ce qui reste à faire et limites connues

- Les noms de tables et de colonnes sont en dur : un renommage dans Grist casse le widget sans message clair.
- Les adresses du document Grist sont écrites en dur dans `src/main.js`.
- Un logo manquant ou illisible retombe sur une image de remplacement.
- Pour les logos en pièce jointe, un visiteur anonyme n'obtient pas toujours de jeton de téléchargement ; la colonne `Logo_url` évite ce cas.
- `dist/index.html` est généré à la main : il faut penser à relancer le build avant de publier.
- Pas de test automatisé du câblage Grist (`main.js`) ni du rendu dans un vrai navigateur : les tests couvrent `logic.js` et `render.js`.

## Contribuer

Ce dépôt est ce qui est servi en production : une branche dédiée par modification, pas de commit direct sur `main`.
