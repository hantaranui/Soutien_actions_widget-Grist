# Bandeau commun sur la page publique

Objectif : ajouter le bandeau commun du projet, visible seulement par les agents reconnus. Le public anonyme ne voit aucun changement. Le formulaire de soutien, les cartes et les filtres ne bougent pas.

**Décision du chef de projet (validée, branche feature/masquer-logos-interne)** : pour l'agent reconnu, le bandeau aux deux logos du widget (`<header class="lcse-header">`, [index.html](../../index.html) lignes 22-25) est caché, afin d'éviter les logos en double. Pour le visiteur anonyme, rien ne change. Voir les sections 3 et 7.

## 1. Où placer la balise, et ce que fait le build

Dans [index.html](../../index.html), dans le `<head>`, **juste après** la balise de grist-plugin-api.js (ligne 13) et **avant** le bloc `<!-- BUILD:CSS -->` :

```html
<script src="https://grist.numerique.gouv.fr/grist-plugin-api.js"></script>
<script src="https://hantaranui.github.io/Bandeau_France-Travail/bandeau.js" data-titre="Page publique de soutien" data-public="oui"></script>
```

Vérification dans [build.js](../../build.js) : le build ne remplace que les deux blocs entre `<!-- BUILD:CSS -->…<!-- /BUILD:CSS -->` et `<!-- BUILD:JS -->…<!-- /BUILD:JS -->` (lignes 54 et 60). Tout le reste du fichier est recopié tel quel dans dist/index.html. La nouvelle balise, placée hors de ces blocs, sera donc copiée sans changement. Le commentaire de build.js (lignes 10-13) confirme que les scripts externes restent externes.

À contrôler après `npm run build` : la balise est présente dans dist/index.html, avec ses deux attributs `data-titre` et `data-public="oui"`.

Deux points tirés du script du bandeau (lu sur GitHub Pages, version 0.3.0) :
- Il retrouve ses attributs par `document.currentScript` : la balise doit être un `<script src>` classique, sans `async`, `defer` ni `type="module"`.
- Il est annoncé « dans le `<head>`, après l'API Grist » : c'est bien l'emplacement ci-dessus.

## 2. Ce que voit le public anonyme

La page exactement comme aujourd'hui. Avec `data-public="oui"`, le script n'insère rien dans la page tant que la personne n'est pas reconnue : pas de bloc vide, pas de message, pas de hauteur ajoutée. Aucune règle CSS du widget n'est modifiée.

## 3. Ce que voit un agent reconnu

Comportement décidé : le bandeau aux logos (`.lcse-header`) est **affiché par défaut** et n'est **caché que lorsque l'agent est reconnu** par le bandeau commun. Un court affichage des logos avant le masquage est accepté.

De haut en bas, pour l'agent reconnu :

```
┌ Bandeau commun (sticky, ombre en bas) ──────────────────────┐
│ [logo FT] [logo Clubs engagés]  Titre · Menu · Prénom Nom   │
└──────────────────────────────────────────────────────────────┘
  (bandeau aux logos .lcse-header : CACHÉ)
  <main> : titre h1, bouton Partager, onglets, filtres, cartes
```

Pour le visiteur anonyme (inchangé) :

```
┌ En-tête propre du widget (.lcse-header) ─────────────────────┐
│ [logo France Travail]                    [logo Clubs engagés]│
└──────────────────────────────────────────────────────────────┘
  <main> : titre h1, bouton Partager, onglets, filtres, cartes
```

Le script insère le bandeau comme **premier enfant de `<body>`**, donc au-dessus de `.lcse-header`.

### Ce qui reste et ce qui disparaît pour l'agent

| Élément | Pour l'agent reconnu | Pour le public anonyme |
| --- | --- | --- |
| Bandeau commun (logos, titre « Page publique de soutien », menu, personne connectée) | affiché | absent (rien n'est inséré) |
| Bandeau aux deux logos du widget (`.lcse-header`) | **caché** | affiché, sans changement |
| Titre h1 « Soutenez les clubs sportifs engagés pour l'insertion par le sport » | **conservé** | conservé |

Plus de logos en double : les logos viennent seulement du bandeau commun (table Bandeau_config : le visuel exact reste à contrôler dans Grist).

### Affichage bref des logos avant le masquage

Le bandeau commun n'est ajouté à la page qu'après la lecture d'Utilisateurs par Grist (réessais possibles jusqu'à 8 s, voir section 5). Pendant ce délai, l'agent voit le bandeau aux logos, puis la page remonte d'une hauteur d'en-tête quand il disparaît. C'est accepté par le chef de projet. Pas de masquage préventif : un masquage par défaut risquerait d'enlever les logos au public si le bandeau échoue.

### Place prise en hauteur (mobile, iframe Grist)

Chiffres lus dans le script du bandeau : hauteur minimale 6,25 rem sur grand écran et 4 rem sous 575 px. Pour l'agent, l'en-tête propre (logos de 40 px + 64 px, 28 px + 44 px sous 480 px, avec leurs marges) est caché : sa hauteur est rendue à la page, la zone qui défile n'est donc plus raccourcie que par le bandeau commun. Sur mobile, [styles.css](../../styles.css) (lignes 37-58) fixe `body` à 100 % de la hauteur, en colonne flex, avec `overflow: hidden`, et seul `.lcse-main` défile : le contrôle sur un vrai téléphone dans l'iframe Grist reste à faire (à valider). Le bandeau est `position: sticky; top: 0`, ce qui est sans effet visible quand c'est `.lcse-main` qui défile.

## 4. Espacement entre le bandeau et la suite de la page

Pour le public : rien ne change. Pour l'agent, `.lcse-header` étant caché, le bandeau (fond blanc, ombre `0 4px 8px` en bas) touche maintenant directement `<main>`. L'ombre du bandeau suffit à le séparer visuellement du contenu ; à confirmer sur le rendu réel.

Recommandation : **ne rien ajouter** dans un premier temps, et regarder le rendu réel.

Si un espace est jugé nécessaire, utiliser les valeurs déjà employées dans [styles.css](../../styles.css) (variables `--ft-spacer-*` avec leur valeur de repli) :

| Variable | Valeur | Source |
| --- | --- | --- |
| `--ft-spacer-xs2` | 0,5 rem | styles.css (repli) |
| `--ft-spacer-s1` | 0,75 rem | styles.css (repli) |
| `--ft-spacer-s2` | 1 rem | styles.css (repli) |

Le fond de page, derrière un tel espace, est `--ft-color-background-neutral-weakest` (styles.css, ligne 26) : l'espace apparaîtrait gris clair, entre deux blocs blancs. Le choix de la valeur (0,5 ou 1 rem) est **à valider** après un essai visuel : aucune règle de la documentation du design system n'a été lue sur ce point précis, et la page espacements du site (https://designsystem.francetravail.io/docs/fondamentaux/espacements.html) n'a pas été consultée.

Pour le public, l'espacement entre l'en-tête propre et `<main>` ne change pas.

## 5. Niveau d'accès demandé à grist.ready

Vérifié dans [src/main.js](../../src/main.js) ligne 641 : `grist.ready({ requiredAccess: "full" });`. C'est le niveau « full » que le bandeau exige (il lit Bandeau_config, Bandeau_liens et Utilisateurs). Aucun changement à faire.

Point de vigilance : le script du bandeau réessaie plusieurs fois (délais jusqu'à 8 s), car il peut être chargé avant l'appel à `grist.ready()`. Ici, l'appel se fait dans main.js, qui est chargé après : l'ordre est correct.

## 6. Tests existants (test/) qui pourraient être touchés

- [test/logic.test.js](../../test/logic.test.js) : logique pure, non concernée.
- [test/render.test.js](../../test/render.test.js) : ne teste que les gabarits de render.js (cartes, filtres, modale, etc.). Aucun test ne lit index.html, `.lcse-header`, build.js ni dist/index.html. **Aucun test existant n'est touché.**
- Rien ne couvre la balise du bandeau ni le rendu navigateur : c'est une vérification humaine (voir ci-dessous).

`npm test` lancé avant tout changement : 154 tests, 154 réussis.

## 7. Repère de présence du bandeau et masquage

### Repère retenu (question fermée)

Vérifié dans le vrai script https://hantaranui.github.io/Bandeau_France-Travail/bandeau.js :
- ligne 323 : le bandeau est un `<div id="bm-bandeau">` ;
- ligne 363 : en mode public (`data-public="oui"`), il n'est pas ajouté à la page au chargement ;
- lignes 521-523 : il n'est ajouté à la page que si la personne est reconnue ;
- ligne 532 : en cas d'erreur en mode public, rien n'est affiché.

Donc `#bm-bandeau` n'est présent dans la page que pour un agent reconnu : c'est le repère à utiliser pour masquer `.lcse-header`.

### Dépendance et risque

- Ce repère **n'est pas un engagement documenté** du bandeau commun : le widget dépend d'un détail interne de l'autre dépôt (Bandeau_France-Travail).
- Si l'id `bm-bandeau` change, le masquage ne se déclenche plus : l'agent retombe sur le **double bandeau** (comportement d'avant la décision, logos en double). C'est un échec sans gravité. **Le public n'est jamais touché** : sans bandeau reconnu, l'en-tête reste affiché dans tous les cas.
- À faire côté pilotage : prévenir l'auteur du dépôt Bandeau_France-Travail que cet id est utilisé, et inclure le contrôle ci-dessous dans la recette après chaque nouvelle version du bandeau.

### Accessibilité du masquage

- Le titre h1 « Soutenez les clubs sportifs engagés pour l'insertion par le sport » reste : il reste le titre de la page pour les lecteurs d'écran, avec ou sans bandeau.
- Le bandeau aux logos caché **ne doit plus être lu ni atteint** par les lecteurs d'écran ni au clavier. Il faut donc un masquage qui le retire aussi de l'arbre d'accessibilité (type `display: none`), et non un simple masquage visuel (opacité, position hors écran, taille nulle) qui le laisserait lisible.
- Les logos étant décoratifs ou redondants avec ceux du bandeau commun, rien n'est perdu pour l'agent : ses logos restent accessibles via le bandeau commun.
- Landmarks : vérifier que la page garde une structure cohérente (un seul repère de bandeau lisible, un `<main>`). Je n'ai pas contrôlé la façon dont le bandeau commun se déclare : à valider avec un lecteur d'écran.
- Aucun élément focalisable ne doit rester caché mais atteignable : Tab doit passer du bandeau commun directement au contenu de `<main>`.
- Aucune information n'est portée seulement par la couleur : le masquage ne change aucune couleur ni aucun composant.

## Cas à recetter (document de test, données fictives)

Chaque test indique le commit testé. Un test = un comportement.

1. **Agent reconnu** (présent dans Utilisateurs) : le bandeau commun est affiché avec la personne connectée ; le bandeau aux logos du widget est caché après un court délai ; le h1 est visible ; plus de logos en double ; Tab passe du bandeau commun à la page sans s'arrêter sur le bandeau caché ; un lecteur d'écran ne lit pas le bandeau caché.
2. **Visiteur anonyme, navigation privée, lien public** (`pp=lcse-soutien`) : la page est identique à l'actuelle ; le bandeau aux logos reste affiché ; aucun bandeau commun, aucun espace vide, aucun message.
3. **Petit écran** (téléphone, iframe Grist), agent puis anonyme : le contenu défile jusqu'en bas, la zone qui défile est correcte, rien ne saute au masquage au point de gêner la lecture.
4. **Fenêtre de soutien ouverte** (modale du formulaire), agent puis anonyme : elle s'ouvre, se ferme (bouton et Échap), reste correctement placée et entièrement visible ; le masquage survenant pendant qu'elle est ouverte ne la déplace pas ni ne casse le focus.
5. **Bandeau en erreur ou id changé** (si faisable sur le document de test) : l'agent voit le double bandeau, le public est inchangé.
6. Clavier : Tab passe dans le bandeau puis dans la page ; le menu se referme avec Échap.

## Questions ouvertes

- Valeur d'espacement éventuelle sous le bandeau commun (aucune, 0,5 rem ou 1 rem) : à valider après un essai visuel.
- Structure des repères (landmarks) avec le bandeau commun : à valider avec un lecteur d'écran.
- Qui prévient l'auteur du bandeau commun de la dépendance à l'id `bm-bandeau` ?
- Fermées : logos en double (remplacé par le masquage pour l'agent) ; repère fiable (`#bm-bandeau`, voir section 7).
