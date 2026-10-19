
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
Commit : docs: carnet de tests du bandeau commun sur la page publique
