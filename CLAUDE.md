
# Projet : Page publique de soutien (widget Grist « Soutenez les clubs sportifs engagés », France Travail)

## Objectif

Page publique du programme « Les clubs sportifs engagés » de France Travail, dans le projet « Partenariat simplifié ». Elle liste les actions menées avec des clubs sportifs et permet à un visiteur (entreprise, partenaire, particulier) de proposer un soutien financier à une action. Les équipes France Travail reçoivent les propositions dans la table Soutiens. Le README.md décrit le widget en détail : le lire avant toute tâche.

## Priorité actuelle

Ajouter le bandeau commun du projet, en mode « page publique » : visible seulement par les agents reconnus, invisible pour le public. Rien d'autre.
Ce dépôt est servi en production (GitHub Pages, branche main) : une branche par modification, jamais de commit direct sur main. La version de test est publiée dans un dépôt de test séparé, pas dans main.

## Technologies

HTML, CSS et JavaScript sans framework ni dépendance npm. Tests avec le lanceur de tests de Node.
Fichiers : index.html et styles.css (version de développement), src/logic.js (logique pure, testable), src/render.js (gabarits HTML), src/main.js (câblage avec l'API Grist et le DOM), build.js (assemble le tout en dist/index.html), dev-server.js (serveur local sans cache), test/ (logic.test.js, render.test.js).
Le fichier publié est dist/index.html. Adresse de production : https://hantaranui.github.io/Soutien_actions_widget-Grist/dist/
Le Design System France Travail et grist-plugin-api.js sont chargés depuis leur CDN.

## Commandes

- Lancer en local : npm run dev (http://localhost:8080 ; autre port : node dev-server.js 3000).
- Assembler : npm run build (génère dist/index.html).
- Tester : npm test.
- Après tout changement dans index.html, styles.css ou src/ : npm run build, npm test, puis commiter les sources ET dist/index.html.

## Mode de travail : PAS À PAS (ne jamais changer)

- Je suis débutante en code. Explique simplement, en français.
- Un seul agent travaille à la fois : celui que j'appelle avec @.
- Un agent ne lance JAMAIS un autre agent de lui-même.
- Fais uniquement la tâche demandée. N'ajoute rien de non demandé.
- Si tu veux t'écarter de la demande ou d'un document fourni, dis-le AVANT d'agir et attends mon accord.
- À la fin de chaque tâche, ARRÊTE-TOI et termine par :
  1. Fichiers lus
  2. Fichiers modifiés ou créés
  3. Tests lancés et résultat (ou "aucun test lancé")
  4. Risques restants
- Ne fais jamais de commit ni de push : c'est moi qui les fais.

## Sécurité et données personnelles

- Aucun secret (mot de passe, clé, token) dans le code ni dans les échanges.
- Ce widget est ouvert à un visiteur anonyme (sans compte), par un lien public avec le paramètre pp=lcse-soutien. Ses droits sont volontairement limités par les règles d'accès du document : lecture de quelques colonnes seulement (Actions non réalisées ni annulées, Cofinancements Montant et Action, Structures Nom et Logo, Federations, DR, DD, Agences : leur nom) et ajout de lignes dans Soutiens, sans pouvoir les relire. Renommer une de ces colonnes casse la page publique.
- Le formulaire collecte des données personnelles (Organisation, Prenom, Nom, Email, Telephone, Montant, Message) et les écrit dans Soutiens (AddRecord). C'est la seule écriture du widget. Toute modification qui touche au formulaire ou à Soutiens passe par @auditeur-securite (RGPD).
- Les adresses du document (PUBLIC_PAGE_URL, ATTACHMENTS_BASE_URL) sont écrites en dur en tête de src/main.js : ne pas les modifier sans mon accord. Dans le document TEST, elles pointent encore vers le document de production (lien de partage, logos).
- Données de test fictives uniquement (exemple : test.un@exemple.fr). Jamais de vraie personne.

## Le bandeau commun (tâche en cours)

Le bandeau commun est un script séparé, publié par le dépôt hantaranui/Bandeau_France-Travail. Il affiche les logos, le titre de la page, le menu de navigation et la personne connectée.

- Pour la page publique, il se charge avec l'attribut data-public="oui" : il ne s'affiche que si la personne est reconnue (agent présent dans la table Utilisateurs) ; sinon (public anonyme), il reste invisible, sans attente ni message.
- Balise exacte, à placer juste après celle de grist-plugin-api.js :
  <script src="https://hantaranui.github.io/Bandeau_France-Travail/bandeau.js" data-titre="Page publique de soutien" data-public="oui"></script>
- Le widget garde son propre en-tête : le public en a besoin. Ne pas le retirer.
- Le widget demande déjà requiredAccess: "full", nécessaire au bandeau.
- Le bandeau lit les tables Bandeau_config, Bandeau_liens et Utilisateurs, protégées par des règles d'accès. Ne rien modifier dans ces tables depuis ce dépôt.

## Design system

Toute interface utilise le design system France Travail (https://designsystem.francetravail.io/), chargé par CDN. Ne jamais inventer de couleur, de police, d'espacement ni de composant : utiliser ses composants et ses variables CSS. Si un composant n'existe pas, le dire et proposer le plus proche. Accessibilité RGAA. Référence : docs/design-system-france-travail.md.

## Données Grist

Les noms de tables et de colonnes sont écrits en dur (TABLES dans src/logic.js). Ne jamais les renommer ni en inventer : me demander. Le document est partagé avec les autres widgets du projet : renommer une table ou une colonne dans Grist peut en casser plusieurs.

## Tests

- Tests automatiques : test/logic.test.js et test/render.test.js (npm test). Ils ne couvrent pas main.js ni le rendu dans un vrai navigateur.
- Tests humains (recetteur) : toujours sur un document de DEV ou le document TEST, avec des données fictives. Le visiteur anonyme se teste avec le lien public ouvert dans une fenêtre de navigation privée. Preuve par version : chaque test indique le commit testé. Un test = un comportement.

## Conventions

- Garder le style de code existant. Commentaires en français.
- Messages de commit : feat:, fix:, test:, docs:, chore:
- Git : toujours une branche (feature/..., fix/..., chore/...), jamais main.
