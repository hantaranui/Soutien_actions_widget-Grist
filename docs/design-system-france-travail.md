
# Design system France Travail

Site : https://designsystem.francetravail.io/
Version lue sur le site : 1.16.0 (page du 01/10/2026)
Version utilisée par ce widget : [à compléter depuis le lien CDN dans src/page-accueil/index.html]

## Ordre des sources (qui fait foi)

1. La feuille de style livrée par le CDN, et son inventaire dans le dépôt : test/design-system-classes.txt. Pour un nom de classe ou une valeur, c'est elle qui fait foi.
2. Le site du design system : pour comprendre un composant, ses variantes, son usage et ses règles d'accessibilité.
3. Les maquettes Figma : pour l'intention visuelle.
   Si le site et la feuille du CDN ne disent pas la même chose, suivre la feuille et le signaler (exemple connu : la documentation annonce une graisse de 400 pour les titres, la feuille applique 500).

## Liens utiles

- Installation : https://designsystem.francetravail.io/docs/prise-en-main/installation.html
- Changelog : https://designsystem.francetravail.io/docs/prise-en-main/changelog.html
- Couleurs : https://designsystem.francetravail.io/docs/fondamentaux/couleurs.html
- Typographie : https://designsystem.francetravail.io/docs/fondamentaux/typographie.html
- Points de rupture : https://designsystem.francetravail.io/docs/fondamentaux/espacements.html
- Variables CSS : https://designsystem.francetravail.io/docs/fondamentaux/variables-css.html
- Icônes : https://designsystem.francetravail.io/docs/bibliotheque/icones.html
- Accessibilité : https://designsystem.francetravail.io/docs/bonnes-pratiques/accessibilite.html
- Composants : https://designsystem.francetravail.io/components/detail/[nom]--[variante].html (exemple : button--primary.html)
- Maquettes Figma : https://www.figma.com/@francetravail

## Règles pour ce widget

- On utilise ses composants et ses variables CSS. On n'invente ni couleur, ni police, ni espacement, ni composant.
- Le design system est chargé par CDN (feuille de style et autoloader). Univers « Outils agent » : classe outil-agent sur body.
- Nos propres classes portent toutes le préfixe home- et ne reprennent jamais un nom de classe du design system.
- test/design-system-classes.txt liste les classes du design system. La commande pour le régénérer est en tête de test/styles.test.js : la relancer quand la version du design system change.
- Un composant manquant : on le signale et on propose le plus proche. On ne le fabrique pas sans validation.
- Ne pas colorer un texte posé sur un fond de couleur. Mesurer les contrastes sur les couleurs calculées par le navigateur.
