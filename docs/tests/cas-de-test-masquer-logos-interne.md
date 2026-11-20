# Recette : masquage du bandeau aux logos pour l'agent reconnu

Document de recette de la décision « quand le bandeau commun (`#bm-bandeau`) est présent, on cache le bandeau aux deux logos du widget (`.lcse-header`) », par la règle CSS `#bm-bandeau ~ .lcse-header { display: none; }` dans `styles.css`. Le visiteur anonyme garde le bandeau aux logos. Le bandeau commun et le titre h1 restent.

- **Environnement** : TEST (jamais PROD).
- **Version testée** : 803666d (publiée sur TEST).
- **Profils** : agent reconnu (présent dans la table Utilisateurs) et visiteur anonyme (lien public avec pp=lcse-soutien, fenêtre de navigation privée).
- **Données** : uniquement fictives. Aucune donnée de TEST n'est créée, modifiée ou supprimée. **Ne jamais envoyer le formulaire de soutien** (il écrit dans Soutiens).
- **Fichier de suivi** : `cas-de-test-masquer-logos-interne.tsv` (même contenu, à ouvrir dans un tableur).
- **Référence** : `docs/ux/bandeau-commun-page-publique.md` (sections 3 et 7).

Avant de commencer, noter : version testée, nom du testeur, date.

## Ce qu'il faut savoir en une minute

Les lignes sont rangées en trois catégories :

1. **Déjà vérifié** par Hanta dans Grist TEST le 20/11/2026 (MASQ-V-01 à MASQ-V-04) : ne pas rejouer. Ces résultats sont annoncés par Hanta, le recetteur ne les a pas constatés.
2. **À jouer par le collègue** : 1 seul parcours (MASQ-P-01), avec son propre compte d'agent.
3. **À jouer par Hanta** : 3 cas (MASQ-H-01 à MASQ-H-03), sans résultat pour l'instant.

**Ce que fait le masquage** : pour un agent reconnu, le bandeau commun s'affiche en haut et le bandeau aux deux logos du widget est caché. Un bref affichage des logos avant le masquage est possible et accepté (le bandeau commun attend la lecture de la table Utilisateurs, jusqu'à 8 secondes). Pour le visiteur anonyme, rien ne change.

Pour le parcours : suivre les étapes, comparer avec le résultat attendu, puis noter **OK**, **KO**, **Bloqué** ou **Non testé**. En cas de KO : décrire ce qui s'est passé et joindre une capture d'écran.

## 1. Le parcours à jouer par le collègue

### MASQ-P-01 : Page publique vue par un agent, bandeau commun puis titre, sans le bandeau aux logos (mineur, criticité proposée, à valider par Hanta et son chef de projet)

**Avant de commencer** : Profil agent reconnu. Document TEST. Version 803666d publiée sur TEST. Le testeur est connecté à Grist avec son propre compte d'agent, présent dans la table Utilisateurs. Au moins une action à soutenir est affichée sur la page. Aucune donnée à créer ou à modifier.

**Étapes**

1. Ouvrir la page publique de soutien dans le document TEST.
1. Attendre environ 8 secondes que la page soit stable (le bandeau commun peut apparaître avec un léger retard, les logos peuvent s'afficher un court instant).
1. Regarder le haut de la page, de haut en bas, et noter ce qui s'affiche.
1. Repérer le titre « Soutenez les clubs sportifs engagés pour l'insertion par le sport ».
1. Sur une action à soutenir, cliquer sur « Soutenir » pour ouvrir la fenêtre de soutien.
1. Regarder la fenêtre : elle doit être entièrement visible.
1. La fermer avec « Annuler ».
1. La rouvrir puis la fermer avec la touche Échap.
1. Regarder la page : elle ne doit pas sauter.

**NE PAS envoyer le formulaire** (il écrit dans Soutiens).

**Données** : aucune saisie. Ne rien taper dans le formulaire.

**Résultat attendu** : À l'étape 3, de haut en bas : le bandeau commun (titre « Page publique de soutien », nom de l'agent connecté, menu), puis directement le titre h1 de la page. Le bandeau aux deux logos du widget (France Travail et Clubs engagés) n'est pas affiché. À l'étape 4, le titre h1 est visible. Aux étapes 5 à 8, la fenêtre s'ouvre, est entièrement visible et se ferme avec « Annuler » et avec Échap. À l'étape 9, la page ne saute pas.

**À savoir** : ne pas rejouer MASQ-V-01 à MASQ-V-04 (déjà vérifiés par Hanta).

| Résultat (OK / KO / Bloqué / Non testé) | Testeur | Date | Remarque |
| --- | --- | --- | --- |
|  |  |  |  |

## 2. Déjà vérifié par Hanta, 20/11/2026 (ne pas rejouer)

Version : 803666d (Grist TEST). Testeur : Hanta. Résultat de chaque ligne : **OK**, annoncé par Hanta, non constaté par le recetteur.

| ID | Ce qui a été vérifié | Résultat constaté |
| --- | --- | --- |
| MASQ-V-01 | Agent reconnu : le bandeau aux logos disparaît | Pour un agent reconnu, le bandeau aux deux logos du widget disparaît. Le bandeau commun et le titre h1 restent. |
| MASQ-V-02 | Visiteur anonyme par lien public : logos gardés | Le bandeau aux deux logos reste affiché. Il n'y a pas de bandeau commun. |
| MASQ-V-03 | Petit écran 450 px, agent reconnu | La page s'affiche correctement à 450 px de large. Profil joué : agent reconnu (précisé par Hanta). |
| MASQ-V-04 | Fenêtre de soutien ouverte puis fermée, sans saut de page, visiteur anonyme | La fenêtre s'ouvre et se ferme sans saut de page. Profil joué : visiteur anonyme (lien public). Formulaire non envoyé, confirmé par Hanta. |

## 3. À jouer par Hanta (aucun résultat pour l'instant)

### MASQ-H-01 : Clavier, Tab ne passe pas sur le bandeau caché (majeur)

**Avant de commencer** : Document TEST. Version 803666d. Agent reconnu connecté. Souris non utilisée pendant le parcours.

**Étapes**

1. Ouvrir la page publique de soutien dans le document TEST, en agent reconnu.
1. Attendre environ 8 secondes.
1. Cliquer dans une zone vide de la page, puis appuyer sur Tab plusieurs fois depuis le haut.
1. Noter l'ordre des éléments qui reçoivent le focus.
1. Dans le bandeau commun, ouvrir le menu au clavier, puis le refermer avec Échap.

**Données** : aucune.

**Résultat attendu** : Tab passe du bandeau commun directement au contenu principal, sans s'arrêter sur le bandeau aux logos caché. Le menu du bandeau se referme avec Échap.

| Résultat (OK / KO / Bloqué / Non testé) | Testeur | Date | Remarque |
| --- | --- | --- | --- |
|  | Hanta |  |  |

### MASQ-H-02 : Lecteur d'écran, un seul bandeau annoncé (majeur)

**Avant de commencer** : Document TEST. Version 803666d. Agent reconnu connecté. Lecteur d'écran activé [À CONFIRMER : lequel, par exemple VoiceOver sur Mac].

**Étapes**

1. Ouvrir la page publique de soutien dans le document TEST, en agent reconnu.
1. Attendre environ 8 secondes.
1. Parcourir la page avec le lecteur d'écran depuis le haut.
1. Noter les repères annoncés (bandeau, principal) et les titres.
1. Vérifier que le bandeau aux logos n'est pas lu.

**Données** : aucune.

**Résultat attendu** : Un seul bandeau est annoncé : le bandeau commun. Le bandeau aux logos caché n'est pas lu. Le titre h1 est annoncé.

**À savoir** : la structure des repères (landmarks) n'a pas encore été contrôlée [À CONFIRMER].

| Résultat (OK / KO / Bloqué / Non testé) | Testeur | Date | Remarque |
| --- | --- | --- | --- |
|  | Hanta |  |  |

### MASQ-H-03 : Id bm-bandeau changé ou script du bandeau bloqué, retour au double bandeau, le public n'est pas touché (majeur)

**Avant de commencer** : Document TEST. Version 803666d. Moyen de simuler le cas sans modifier les données de TEST [À CONFIRMER : par exemple bloquer bandeau.js dans les outils de développement du navigateur ; ne pas modifier le dépôt du bandeau].

**Étapes**

1. Agent reconnu : simuler le cas (script bandeau.js bloqué, ou id bm-bandeau différent).
1. Ouvrir la page publique de soutien dans le document TEST.
1. Regarder le haut de la page.
1. Visiteur anonyme (navigation privée, lien public) : refaire avec le même blocage.
1. Retirer le blocage en fin de test.

**Données** : aucune.

**Résultat attendu** : Agent reconnu : retour au double bandeau, c'est-à-dire que le bandeau aux deux logos du widget est de nouveau affiché (avec le bandeau commun si seul l'id a changé, sans lui si le script est bloqué), sans erreur gênante. Visiteur anonyme : page inchangée, logos gardés, pas de bandeau commun.

**À savoir** : échec sans gravité côté agent, le public n'est jamais touché.

| Résultat (OK / KO / Bloqué / Non testé) | Testeur | Date | Remarque |
| --- | --- | --- | --- |
|  | Hanta |  |  |

## Points à confirmer

1. MASQ-V-03 n'a été joué qu'en agent reconnu et MASQ-V-04 qu'en visiteur anonyme : les profils manquants (V-03 en visiteur anonyme, V-04 en agent reconnu) ne sont pas joués ici. Le collègue joue MASQ-P-01 (agent reconnu, fenêtre de soutien).
1. MASQ-V-01 à MASQ-V-04 : résultats annoncés par Hanta, non constatés par le recetteur.
1. MASQ-P-01 : criticité « mineur » proposée par le recetteur (masquage cosmétique, public jamais touché), à valider par Hanta et son chef de projet.
1. MASQ-H-02 : lecteur d'écran à utiliser, et structure des repères (landmarks).
1. MASQ-H-03 : moyen exact de simuler le cas sur TEST.
1. Catégorie « 4 - À jouer par Hanta » et préfixe « MASQ-H » : ajoutés par le recetteur, car le modèle n'a pas de catégorie pour les cas à ton nom. À valider.
