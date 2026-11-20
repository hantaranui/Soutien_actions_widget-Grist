# Journal de revue — Page publique de soutien (widget Soutien)

Une fiche par tâche, toujours avec ces champs dans cet ordre. Copier le bloc ci-dessous à la fin du fichier et le remplir.

## Tâche [n°] — [titre]

Date :
Agent : @
Prompt :

Note /5 :
Ce qui allait :
Ce que j'ai fait corriger :
Tests : [nombre] lancés, [nombre] réussis
Fichiers modifiés :
Build refait : oui / non / pas nécessaire
Commit :

---

## Tâche 1 — Sprint 0 : installation de la squad

Date : 17/10/2026
Agent : @ aucun (fait à la main)
Prompt : sans objet

Note /5 : sans objet
Ce qui allait : branche chore/sprint-0-squad créée depuis ajout-readme (qui contient main et le README) ; 8 agents copiés de _squad-base et le recetteur de la Page d'accueil, sans rien écraser ; CLAUDE.md complet écrit d'après le README ; fiche du design system copiée dans docs/ ; WebFetch ajouté à designer-ux et relecteur ; phrases « Dans ce dépôt » ajoutées à dev-interface, testeur, recetteur et auditeur-securite
Ce que j'ai fait corriger : sans objet
Tests : 0 lancés, 0 réussis (installation, pas de code)
Fichiers modifiés : CLAUDE.md, REVIEW_LOG.md, .claude/agents/ (9 fichiers), docs/design-system-france-travail.md
Build refait : pas nécessaire
Commit : 43759ae — chore: installer la squad d'agents (Sprint 0 du widget Soutien)

## Tâche 2 — Fiche de conception : bandeau commun sur la page publique

Date : 17/10/2026
Agent : @designer-ux
Prompt : décrire l'ajout du bandeau commun en mode page publique (data-public="oui") : place de la balise, ce que voient le public et les agents, doublons, espacement, niveau d'accès, tests touchés

Note /5 : 5
Ce qui allait : a vérifié que build.js recopie la balise telle quelle ; niveau d'accès « full » confirmé (src/main.js:641) ; doublons repérés (logos) et solution de repli proposée sans décider seul ; tests lancés avant tout changement (154/154) ; risque sur la hauteur mobile signalé
Ce que j'ai fait corriger : rien. Décisions : logos en double acceptés pour les agents ; aucun espacement ajouté ; hauteur mobile à vérifier pendant les tests
Tests : 154 lancés, 154 réussis (avant changement)
Fichiers modifiés : docs/ux/bandeau-commun-page-publique.md (créé)
Build refait : pas nécessaire
Commit : 0b1c095 — docs: fiche UX et journal du bandeau commun sur la page publique

## Tâche 3 — Ajout de la balise du bandeau commun sur la page publique

Date : 17/10/2026
Agent : @dev-interface
Prompt : ajouter dans le  de index.html la balise du bandeau commun avec data-titre="Page publique de soutien" et data-public="oui", et rien d'autre ; build et tests

Note /5 : 5
Ce qui allait : une seule ligne ajoutée (index.html:14) ; build refait ; 154/154 tests réussis comme avant ; balise vérifiée dans dist/index.html ; a signalé que le build rattrapait aussi la correction « corbeille » jamais publiée
Ce que j'ai fait corriger : rien. Accepté : dist/index.html remis en accord avec les sources (correction corbeille incluse). À signaler au chef : la correction corbeille n'était pas active en PROD
Tests : 154 lancés, 154 réussis
Fichiers modifiés : index.html, dist/index.html (régénéré)
Build refait : oui
Commit : 2b52cc9 — feat: bandeau commun en mode page publique

## Tâche 4 — Carnet de tests du bandeau commun sur la page publique

Date : 17/10/2026
Agent : @recetteur
Prompt : écrire le carnet BAN-01 à BAN-06 au format du modèle Au carré (colonnes de Cas_de_test) et le tableau des exécutions

Note /5 : 5
Ce qui allait : colonnes du modèle Excel respectées ; un test = un comportement ; résultats non inventés ; points à confirmer marqués ; rappel RGPD pour le test du formulaire
Ce que j'ai fait corriger : rien. Complété à la main : résultats de BAN-04 à BAN-06 ; BAN-01 bloqué (accès public du document de test)
Tests : 6 lancés, 5 réussis, 1 bloqué (BAN-01)
Fichiers modifiés : docs/tests/carnet-bandeau-page-publique.md (créé)
Build refait : pas nécessaire
Commit : 66679a8 - docs: carnet de tests du bandeau commun sur la page publique

## Tâche 5 — Inspection du bandeau aux logos et du repère du bandeau commun

Date : 20/11/2026
Agent : @relecteur
Prompt : inspecter (lecture seule) où est le bandeau aux deux logos, si le titre h1 en est séparé, et comment savoir qu'un agent est reconnu par le bandeau commun ; proposer des solutions sans les coder

Note /5 : sans objet
Ce qui allait : fichiers et lignes cités ; titre h1 séparé du bandeau (src/main.js:173) ; limite signalée honnêtement (repère #bm-bandeau issu d'un résumé du script externe, marqué non vérifié) ; recommandation de masquer par CSS, sans retirer le header
Ce que j'ai fait corriger : rien. Vérifié à la main dans le vrai bandeau.js : #bm-bandeau créé l. 323, non ajouté à la page en mode public (l. 363), ajouté seulement si la personne est reconnue (l. 521-523)
Tests : aucun lancé
Fichiers modifiés : aucun
Build refait : pas nécessaire
Commit : aucun

## Tâche 6 — Fiche UX : masquer le bandeau aux logos en interne

Date : 20/11/2026
Agent : @designer-ux
Prompt : mettre à jour docs/ux/bandeau-commun-page-publique.md (logos cachés pour l'agent reconnu, inchangés pour le public ; fermer la question du repère ; accessibilité ; cas de recette)

Note /5 : 5
Ce qui allait : n'a écrit que dans docs/ux/ ; faits vérifiés repris tels quels ; h1 conservé ; masquage prévu en display: none (lecteurs d'écran et clavier) ; cas à recetter ajoutés (id qui change, clavier)
Ce que j'ai fait corriger : rien (ajouts de schémas et de tableau jugés dans le sujet)
Tests : aucun lancé
Fichiers modifiés : docs/ux/bandeau-commun-page-publique.md
Build refait : pas nécessaire
Commit : 2aff71b - docs: mettre à jour la fiche UX du bandeau pour masquer les logos en interne

## Tâche 7 — CSS : cacher le bandeau aux logos quand le bandeau commun est présent

Date : 20/11/2026
Agent : @dev-interface
Prompt : ajouter dans styles.css la règle #bm-bandeau ~ .lcse-header { display: none; } (alternative sans :has(), choisie car les navigateurs visés ne sont pas connus) ; build et tests

Note /5 : sans objet
Ce qui allait : s'est arrêté avant de coder faute d'information sur les navigateurs, au lieu de l'inventer ; a proposé une alternative sans :has() ; a vérifié que le header est un enfant direct de body ; n'a touché ni index.html, ni src/main.js, ni REVIEW_LOG.md
Ce que j'ai fait corriger : rien (une correction de consigne : règle sans :has())
Tests : build OK ; 154 tests, 154 réussis, 0 échec. Aucun test automatique ne couvre le CSS : rendu à valider en recette
Fichiers modifiés : styles.css, dist/index.html
Build refait : oui
Commit : fa93d15 - feat: cacher le bandeau aux logos quand le bandeau commun est présent