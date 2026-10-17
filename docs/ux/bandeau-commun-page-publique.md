# Bandeau commun sur la page publique

Objectif : ajouter le bandeau commun du projet, visible seulement par les agents reconnus. Le public anonyme ne voit aucun changement. Le formulaire de soutien, les cartes et les filtres ne bougent pas.

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

De haut en bas :

```
┌ Bandeau commun (sticky, ombre en bas) ──────────────────────┐
│ [logo FT] [logo Clubs engagés]  Titre · Menu · Prénom Nom   │
└──────────────────────────────────────────────────────────────┘
┌ En-tête propre du widget (.lcse-header) ─────────────────────┐
│ [logo France Travail]                    [logo Clubs engagés]│
└──────────────────────────────────────────────────────────────┘
  <main> : titre h1, bouton Partager, onglets, filtres, cartes
```

Le script insère le bandeau comme **premier enfant de `<body>`**, donc au-dessus de `.lcse-header`.

### Éléments en double

| Élément | Bandeau | En-tête propre | Double ? |
| --- | --- | --- | --- |
| Logo France Travail | oui | oui | **oui** |
| Logo « Les clubs sportifs engagés » | oui | oui | **oui** |
| Titre | « Page publique de soutien » | aucun titre dans l'en-tête ; le h1 de la page est « Soutenez les clubs sportifs engagés pour l'insertion par le sport » | non (textes différents) |
| Menu, personne connectée | oui | non | non |

Les logos du bandeau viennent de la table Bandeau_config : le visuel exact reste à contrôler dans Grist.

**Acceptable ?** Oui pour cette tâche, à valider par la personne qui pilote :
- Les logos en double n'apparaissent que pour les agents, jamais pour le public.
- Aucune information n'est contradictoire.
- Les retirer demanderait de masquer `.lcse-header` seulement pour les agents. Le widget ne sait pas aujourd'hui quand le bandeau est affiché, et rien dans le script ne documente un repère stable pour le détecter (à valider). C'est du code en plus : hors de cette tâche.

**Si c'est jugé inacceptable**, solution la plus simple : ajouter une règle CSS dans [styles.css](../../styles.css) qui masque `.lcse-header` quand le bandeau est présent. L'en-tête reste intact pour le public. Il faut d'abord identifier un repère fiable de la présence du bandeau (à valider avec l'auteur du dépôt Bandeau_France-Travail). Ne pas retirer l'en-tête du HTML.

### Place prise en hauteur (mobile, iframe Grist)

Chiffres lus dans le script du bandeau : hauteur minimale 6,25 rem sur grand écran et 4 rem sous 575 px, plus l'en-tête propre (logos de 40 px + 64 px, 28 px + 44 px sous 480 px, avec leurs marges). Sur mobile, [styles.css](../../styles.css) (lignes 37-58) fixe `body` à 100 % de la hauteur, en colonne flex, avec `overflow: hidden`, et seul `.lcse-main` défile. Le bandeau devient un enfant de plus de cette colonne : la zone qui défile est plus courte pour les agents. À vérifier sur un vrai téléphone dans l'iframe Grist (à valider). Le bandeau est `position: sticky; top: 0`, ce qui est sans effet visible quand c'est `.lcse-main` qui défile.

## 4. Espacement entre le bandeau et l'en-tête propre

Aujourd'hui : aucun espace. Le bandeau (fond blanc, ombre `0 4px 8px` en bas) touche `.lcse-header` (fond blanc, trait bas de 1 px). L'ombre du bandeau suffit à les séparer visuellement.

Recommandation : **ne rien ajouter** dans un premier temps, et regarder le rendu réel.

Si un espace est jugé nécessaire, utiliser les valeurs déjà employées dans [styles.css](../../styles.css) (variables `--ft-spacer-*` avec leur valeur de repli) :

| Variable | Valeur | Source |
| --- | --- | --- |
| `--ft-spacer-xs2` | 0,5 rem | styles.css (repli) |
| `--ft-spacer-s1` | 0,75 rem | styles.css (repli) |
| `--ft-spacer-s2` | 1 rem | styles.css (repli) |

Le fond de page, derrière un tel espace, est `--ft-color-background-neutral-weakest` (styles.css, ligne 26) : l'espace apparaîtrait gris clair, entre deux blocs blancs. Le choix de la valeur (0,5 ou 1 rem) est **à valider** après un essai visuel : aucune règle de la documentation du design system n'a été lue sur ce point précis, et la page espacements du site (https://designsystem.francetravail.io/docs/fondamentaux/espacements.html) n'a pas été consultée.

L'espacement entre l'en-tête propre et `<main>` ne change pas.

## 5. Niveau d'accès demandé à grist.ready

Vérifié dans [src/main.js](../../src/main.js) ligne 641 : `grist.ready({ requiredAccess: "full" });`. C'est le niveau « full » que le bandeau exige (il lit Bandeau_config, Bandeau_liens et Utilisateurs). Aucun changement à faire.

Point de vigilance : le script du bandeau réessaie plusieurs fois (délais jusqu'à 8 s), car il peut être chargé avant l'appel à `grist.ready()`. Ici, l'appel se fait dans main.js, qui est chargé après : l'ordre est correct.

## 6. Tests existants (test/) qui pourraient être touchés

- [test/logic.test.js](../../test/logic.test.js) : logique pure, non concernée.
- [test/render.test.js](../../test/render.test.js) : ne teste que les gabarits de render.js (cartes, filtres, modale, etc.). Aucun test ne lit index.html, `.lcse-header`, build.js ni dist/index.html. **Aucun test existant n'est touché.**
- Rien ne couvre la balise du bandeau ni le rendu navigateur : c'est une vérification humaine (voir ci-dessous).

`npm test` lancé avant tout changement : 154 tests, 154 réussis.

## Vérifications humaines à prévoir (document de test, données fictives)

1. Fenêtre de navigation privée, lien public : la page est identique à l'actuelle, aucun bandeau, aucun espace vide en haut.
2. Agent connu (dans Utilisateurs) : bandeau visible au-dessus de l'en-tête propre, avec la personne connectée.
3. Mobile, dans l'iframe Grist : le contenu défile toujours jusqu'en bas, la modale du formulaire s'ouvre et se ferme normalement.
4. Clavier : Tab passe dans le bandeau puis dans la page ; le menu se referme avec Échap.

## Questions ouvertes

- Les logos en double pour les agents sont-ils acceptés ? (proposition : oui)
- Quel repère fiable indique que le bandeau est affiché, si un masquage de `.lcse-header` est un jour demandé ?
- Valeur d'espacement éventuelle (aucune, 0,5 rem ou 1 rem) : à valider après un essai visuel.
