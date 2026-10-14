# Tâches — Traiter une pièce justificative depuis l'écran de suivi

**Spec source** : `specs/003-traitement-pj/spec.md` (statut : Validée)
**Plan source** : `specs/003-traitement-pj/plan.md` (statut : Validé)
**Statut** : Validé
**Date** : 2026-10-14

> Chaque tâche est atomique, ordonnée, et rattachée à un critère
> d'acceptation. Une tâche sans rattachement n'existe pas, sauf mention
> explicite **fondation** — auquel cas elle rend possible les tâches
> suivantes plutôt que de couvrir un critère directement. Une tâche qui ne
> tient pas en une session de travail doit être découpée.

Légende : `[P]` = parallélisable avec les tâches voisines portant la même
marque.

Chemins abrégés : `pj/` = `frontend/src/app/pieces-justificatives/`.

---

## Lot 0 — Socle backend

- [x] **T001** — Ajouter Zod au backend (plan, section 3 et D3) `[P]`
  - Fichiers : `backend/package.json`, `backend/package-lock.json`
  - Dépend de : —
  - Couvre : — (fondation, prérequis de T020 ; article VI)
  - Terminé quand : `zod` figure dans les `dependencies` du backend avec la même version majeure que le frontend (`^4.4.3`), `npm ci` puis `npx tsc --noEmit` passent.
  - **Note** : `npm install zod@^4.4.3` a résolu et déclaré `^4.6.7` (même majeure 4 ; le frontend a 4.4.3 installé). `npm ci`, `npx tsc --noEmit` et les 6 tests backend de la 001 passent.

- [x] **T002** — Habilitation « Traitement des PJ » dans le stub d'identité `[P]`
  - Fichiers : `backend/src/auth/current-user.stub.ts`
  - Dépend de : —
  - Couvre : — (fondation, prérequis de CA6.2)
  - Terminé quand : le stub exporte la constante `HABILITATION_TRAITEMENT_PJ` et une fonction `aHabilitationTraitementPJ()` ; l'utilisateur simulé la possède par défaut et la perd si `STUB_SANS_HABILITATION_TRAITEMENT=true` (en conservant la consultation) ; le commentaire « STUB TEMPORAIRE » mentionne la nouvelle habilitation.

- [x] **T003** — Magasin en mémoire réinitialisable, en ajout seul, versionné (plan, D6)
  - Fichiers : `backend/src/data/pieces-justificatives.ts`, `backend/src/routes/pieces-justificatives.test.ts`
  - Dépend de : —
  - Couvre : — (fondation, prérequis de CA1.2, CA2.5, CA3.3, CA4.2, CA5.2 et du cas limite « redémarrage »)
  - Terminé quand : le jeu fixe est une graine dont le magasin est une copie profonde ; chaque PJ porte `version: 0` ; le module expose la lecture (copies), `remplacerPiece` et `reinitialiserPiecesJustificatives()`, et aucune fonction qui modifie ou retire une entrée d'historique ; les tests de route existants appellent la réinitialisation dans `beforeEach` et les 6 tests de la 001 passent toujours.
  - **Note** : `remplacerPiece` vérifie en plus l'invariant d'ajout seul (une entrée de plus, entrées antérieures identiques, version + 1) et lève une erreur sinon : l'article III est garanti par le magasin lui-même, pas seulement par ses appelants. La liste ne renvoie toujours que les 4 champs du résumé (sans `version`).

---

## Lot 1 — Domaine de traitement (fonctions pures)

- [x] **T010** — Matrice de transition, statut atteint, motifs automatiques, disponibilités
  - Fichiers : `backend/src/domain/traitement-pj.ts`
  - Dépend de : —
  - Couvre : CA1.3, CA2.6, CA3.4, CA4.3, CA5.3, CA5.4, CA6.1, CA6.2 (règles) ; CA3.3, CA4.2, CA5.2 (textes des motifs)
  - Terminé quand : le module exporte `ActionPJ`, la matrice de la section 4 bis de la spec sous forme de table, `actionAutorisee(statut, action)`, `statutAtteint(action)`, `motifAutomatique(action)` (textes exacts de la décision n° 13 ; aucun motif pour valider) et `disponibilites(statut, habilite)`, qui renvoie toujours les 5 actions avec `disponible` et `raison`, la raison `HABILITATION_MANQUANTE` passant avant `TRANSITION_INTERDITE`.

- [x] **T011** — Validation du motif de rejet
  - Fichiers : `backend/src/domain/traitement-pj.ts`
  - Dépend de : T010
  - Couvre : CA2.2, CA2.3
  - Terminé quand : `MOTIF_REJET_LONGUEUR_MAX = 10000` est exportée, avec un commentaire renvoyant à la décision n° 14 ; une fonction refuse un motif dont le `trim()` est vide et un motif de plus de 10 000 **points de code** (`[...motif].length`) ; le motif accepté est conservé tel que saisi (pas de `trim` du contenu).

- [x] **T012** — Application d'une action à une PJ
  - Fichiers : `backend/src/domain/traitement-pj.ts`
  - Dépend de : T010, T011
  - Couvre : CA1.2, CA2.5, CA3.3, CA4.2, CA5.2 (contenu de l'entrée) ; article III
  - Terminé quand : `appliquerAction(piece, commande, auteur, maintenant)` renvoie une **nouvelle** PJ avec le statut atteint, `version + 1` et un historique égal à l'ancien augmenté d'une seule entrée (date ISO de `maintenant`, statut atteint, auteur, motif saisi ou automatique, ou aucun motif pour valider) ; la PJ d'entrée n'est pas modifiée ; une action non autorisée par la matrice est refusée sans rien produire.
  - **Note** : le contrôle de version est aussi porté par `appliquerAction` (fonction pure, donc testable unitairement — plan, article VII « contrôle de version ») ; la route se contente de traduire le résultat. Le motif de rejet est revérifié dans le domaine en défense, en plus de la frontière (T020).

- [x] **T013** — Tests unitaires du domaine
  - Fichiers : `backend/src/domain/traitement-pj.test.ts`
  - Dépend de : T010, T011, T012
  - Couvre : CA6.1 (25 couples vérifiés), CA6.2 (priorité de la raison), CA2.2, CA2.3, CA3.3, CA4.2, CA5.2, CA5.3 (vérifiés)
  - Terminé quand : `npm test` passe et couvre explicitement :
    - les 25 couples (statut, action) ;
    - le statut atteint et le motif exact de chaque action ;
    - un motif vide ou fait d'espaces et de retours à la ligne, refusé ;
    - 10 000 points de code, y compris des caractères hors BMP, acceptés intégralement ; 10 001 refusés ;
    - les entrées antérieures restent strictement égales, une seule entrée est ajoutée et la version est incrémentée ;
    - une PJ réouverte peut de nouveau être validée.
  - **Note** : `npm test` : 42 tests, 42 passent (6 de la 001, 25 couples de la matrice, 11 règles). Les fichiers de test, exclus de `tsconfig.json`, sont aussi vérifiés par `tsc --strict` en ligne de commande.

---

## Lot 2 — API

- [x] **T020** — Schéma de la commande d'action
  - Fichiers : `backend/src/routes/commande-action.schema.ts`
  - Dépend de : T001, T011
  - Couvre : CA2.2, CA2.3 (frontière HTTP) ; exigence « l'auteur n'est jamais fourni par l'interface » (spec, section 6)
  - Terminé quand : le schéma, en objet strict et union discriminée sur `action`, accepte `{ action, version }` et, pour `rejeter` seulement, `motif` ; tout champ inconnu (`auteur`, `date`…) est rejeté ; les erreurs se traduisent en `REQUETE_INVALIDE`, `MOTIF_OBLIGATOIRE` ou `MOTIF_TROP_LONG`, et le message de ce dernier indique la longueur maximale.

- [x] **T021** — Enrichir `GET /api/pieces-justificatives/:reference` avec `version` et `actions` `[P]`
  - Fichiers : `backend/src/routes/pieces-justificatives.ts`, `backend/src/data/pieces-justificatives.ts`
  - Dépend de : T002, T003, T010
  - Couvre : CA6.1 (cohérence entre interface et système), CA6.2, CA5.3
  - Terminé quand : la réponse `200` du détail contient `version` et les 5 `actions` calculées par `disponibilites()` avec l'habilitation de l'utilisateur courant ; les réponses 403 et 404 et `GET /api/pieces-justificatives` (liste) sont inchangés.

- [x] **T022** — Route `POST /api/pieces-justificatives/:reference/actions`
  - Fichiers : `backend/src/routes/pieces-justificatives.ts`
  - Dépend de : T012, T020, T021
  - Couvre : CA1.1, CA1.3, CA2.1, CA2.6, CA3.1, CA3.4, CA4.1, CA4.3, CA5.1, CA5.4, CA6.1, CA6.2 (contrôle serveur) ; cas limites « concurrence » et « double clic »
  - Terminé quand : les contrôles s'enchaînent dans l'ordre du plan (section 5) :
    1. habilitation de consultation, puis habilitation de traitement : `403` ;
    2. schéma de la commande : `400` ;
    3. existence de la PJ : `404` ;
    4. version : `409 PJ_MODIFIEE`, avec `pieceActuelle` ;
    5. matrice : `409 TRANSITION_INTERDITE`.
  - **Note** : vérifié par appels réels (curl) : 400 MOTIF_OBLIGATOIRE, 400 REQUETE_INVALIDE (champ `auteur`), 404, 409 TRANSITION_INTERDITE, 200 avec entrée « Gestionnaire de démonstration », puis 409 PJ_MODIFIEE avec l'ancienne version.

    Les contrôles 3 à 5 et l'écriture s'exécutent sans `await` intermédiaire. Auteur = `utilisateurCourant().nom` et date = horloge serveur. Le succès renvoie `200` avec le détail à jour, `version` et `actions` comprises.

- [x] **T023** — Tests de route : succès, habilitation, validation, transitions
  - Fichiers : `backend/src/routes/traitement-pj.routes.test.ts`
  - Dépend de : T022
  - Couvre : CA1.1–CA1.3, CA2.1–CA2.3, CA2.5, CA2.6, CA3.1, CA3.3, CA3.4, CA4.1–CA4.3, CA5.1–CA5.4, CA6.1, CA6.2 (vérifiés côté serveur)
  - Terminé quand : `npm test` passe, avec la réinitialisation du magasin avant chaque test, et couvre :
    - **succès des 5 actions** : `200`, statut atteint, nouvelle entrée (auteur simulé, motif attendu), version + 1 ;
    - **sans « Traitement des PJ »** : `403`, PJ et historique relus inchangés, `GET` du détail toujours `200` avec les 5 actions indisponibles pour raison d'habilitation ;
    - **`400`** : action inconnue, version absente, motif absent ou vide, motif de 10 001 points de code, champ `auteur` fourni ;
    - **`404`** : référence inconnue ;
    - **`409 TRANSITION_INTERDITE`** : valider une PJ validée, sans effet sur la PJ ;
    - **actions du détail** : cohérentes avec la matrice pour les 5 PJ de démonstration.
  - **Note** : `npm test` : 60 tests, 60 passent. Premier passage : 1 échec dû au jeu de test lui-même (motif construit à 9 999 caractères au lieu de 10 000), corrigé dans le test, aucun changement de code.

- [x] **T024** — Tests de route : concurrence et double envoi
  - Fichiers : `backend/src/routes/traitement-pj.routes.test.ts`
  - Dépend de : T022
  - Couvre : cas limites « deux gestionnaires simultanés » et « double déclenchement » (spec, section 5) ; décision n° 8
  - Terminé quand : `npm test` passe et couvre :
    - une version périmée renvoie `409 PJ_MODIFIEE` avec `pieceActuelle` à jour ;
    - après une suspension puis une reprise (même statut qu'au départ), une action envoyée avec l'ancienne version est refusée ;
    - deux `POST` simultanés (`Promise.all`) avec la même version donnent exactement un `200`, un `409` et une seule entrée ajoutée.
  - **Note** : `npm test` : 63 tests, 63 passent.

---

## Lot 3 — Frontend : données et service

- [x] **T030** — Étendre les schémas Zod du détail et mettre à jour les jeux de test existants
  - Fichiers : `pj/piece-justificative-detail.schema.ts`, `pj/detail/detail.component.spec.ts`, `pj/liste/liste.component.spec.ts`
  - Dépend de : T021
  - Couvre : — (fondation, article VI ; non-régression des tests 001)
  - Terminé quand : le schéma du détail exige `version` (entier ≥ 0) et `actions` (5 × `{ action, disponible, raison? }`) ; `ActionPJ` et `DisponibiliteAction` sont exportés ; les données de test des specs existantes sont complétées et `npx ng test --watch=false` passe avec les 12 tests de la 001.
  - **Note** : `npx ng test --watch=false` : 6 fichiers, 13 tests, 13 passent. Le chiffre de 12 tests cité dans `CLAUDE.md` pour la 001 ne compte pas `app.spec.ts`.

- [x] **T031** — Méthode de service `executerAction` et erreurs enrichies
  - Fichiers : `pj/pieces-justificatives.service.ts`
  - Dépend de : T030, T022
  - Couvre : — (fondation, prérequis de T042)
  - Terminé quand : `executerAction(reference, commande)` envoie la commande et renvoie le détail validé par le schéma ; `ErreurApi` contient en plus :
    - `conflit`, qui porte le détail à jour validé ;
    - `transition` ;
    - `validation`, qui porte le code.

    Un `413` est traduit en `validation`.

- [x] **T032** — Tests du service
  - Fichiers : `pj/pieces-justificatives.service.spec.ts`
  - Dépend de : T031
  - Couvre : — (vérifie la fondation T031)
  - Terminé quand : `ng test` passe et couvre la traduction de `200`, `400`, `403`, `404`, `409 PJ_MODIFIEE` (avec détail) et `409 TRANSITION_INTERDITE`, ainsi que le rejet d'une réponse non conforme au schéma.
  - **Note** : `ng test` : 7 fichiers, 21 tests, 21 passent (8 nouveaux).

---

## Lot 4 — Frontend : interface

- [x] **T040** — Boutons d'action dans le détail, avec état indisponible expliqué (plan, D5)
  - Fichiers : `pj/detail/detail.component.ts`, `pj/detail/detail.component.html`, `frontend/src/styles.css`
  - Dépend de : T030
  - Couvre : CA1.3, CA2.6, CA3.4, CA4.3, CA5.4, CA6.1, CA6.2 (affichage)
  - Terminé quand : le détail affiche toujours les 5 boutons (Valider, Rejeter, Suspendre, Reprendre, Réouvrir), pilotés uniquement par `detail.actions`, sans aucune règle de transition dans le composant. Un bouton indisponible :
    - porte `aria-disabled="true"`, reste atteignable au clavier et ne déclenche rien au clic ;
    - est relié par `aria-describedby` à un texte visible : « Indisponible : la pièce est <statut> » ou « Indisponible : habilitation « Traitement des PJ » requise ».
  - **Note** : les actions sont un groupe (`role="group"`) de `div` et non une liste `ul/li` : les tests de la 001 (CA3.2, CA3.3) sélectionnent tous les `li` et `ul` du détail comme étant l'historique, et une liste d'actions les faisait échouer (2 échecs constatés). Les libellés d'action et d'explication sont dans `pj/libelle-action.ts` (mise en mots uniquement, la disponibilité vient du serveur). `ng test` : 21/21.

    Le style `[aria-disabled='true']` réutilise les jetons CSS de la 002.

- [x] **T041** — Boîte de confirmation `<dialog>` avec saisie du motif de rejet
  - Fichiers : `pj/detail/confirmation-action.component.ts`, `pj/detail/confirmation-action.component.html`, `pj/detail/motif-rejet.ts`
  - Dépend de : T040
  - Couvre : CA1.4, CA2.2, CA2.3, CA2.7, CA3.2 ; accessibilité de la confirmation (spec, section 6)
  - Terminé quand : toute action ouvre une boîte modale native (`showModal()`) qui nomme l'action et la PJ ; Annuler et Échap ferment sans rien envoyer et rendent le focus au bouton déclencheur. Le champ de motif :
    - n'apparaît que pour Rejeter ;
    - est validé par une fonction pure (`motif-rejet.ts`, limite reprise de la décision n° 14), avec un message d'erreur relié au champ par `aria-describedby` en cas de motif vide ou de plus de 10 000 caractères ;
    - n'a pas d'attribut `maxlength`, qui tronquerait la saisie sans rien dire.
  - **Note** : `ng build` passe, avec l'avertissement « bundle initial exceeded maximum budget » (508,26 ko pour un budget de 500 ko, avertissement et non erreur). Le budget n'est pas modifié ; point remonté à l'utilisateur. Comportement vérifié par les tests T045 et dans le navigateur (T050).

- [x] **T042** — Exécuter l'action depuis le détail et gérer les retours
  - Fichiers : `pj/detail/detail.component.ts`, `pj/detail/detail.component.html`, `pj/detail/confirmation-action.component.ts`
  - Dépend de : T031, T041
  - Couvre : CA1.1, CA1.2, CA2.1, CA2.5, CA3.1, CA4.1, CA4.2, CA5.1, CA5.2 (affichage dans le détail) ; cas limites « erreur réseau », « concurrence », « double clic », « action interdite »
  - Terminé quand :
    - **pendant l'envoi** : le bouton de confirmation est désactivé ;
    - **en cas de succès** : le détail (statut, historique, actions) est remplacé par la réponse, la boîte se ferme et une région `role="status"` annonce « Statut mis à jour : <statut> » ;
    - **erreur réseau ou `validation`** : la boîte reste ouverte avec un message explicite et le motif saisi est conservé ;
    - **`conflit`** : la boîte se ferme, le message « Cette pièce a été modifiée entre-temps » s'affiche et le détail à jour est montré ;
    - **`transition` ou `habilitation`** : message explicite.

- [x] **T043** — Répercuter le changement dans la liste (plan, D7)
  - Fichiers : `pj/detail/detail.component.ts`, `pj/liste/liste.component.ts`, `pj/liste/liste.component.html`
  - Dépend de : T042
  - Couvre : CA1.1, CA2.1, CA3.1, CA4.1, CA5.1 (« dans la liste sans rechargement manuel ») ; non-régression filtre, tri et recherche (spec, section 6)
  - Terminé quand : le détail émet `pieceModifiee` (le résumé de la PJ) après un succès ou un `conflit` ; la liste remplace la ligne correspondante dans `piecesBrutes` sans recharger ; en fermant le détail, la ligne montre le nouveau statut avec le filtre, le tri et la recherche intacts.

- [x] **T044** — Affichage fidèle des motifs longs et multilignes `[P]`
  - Fichiers : `pj/detail/detail.component.html`, `frontend/src/styles.css`
  - Dépend de : T030
  - Couvre : CA2.4 ; cas limite « motif contenant du balisage »
  - Terminé quand : le motif est rendu par interpolation de texte (jamais `innerHTML`), avec `white-space: pre-line` et `overflow-wrap: anywhere`. Un motif de 10 000 caractères comportant des retours à la ligne et `<b>` s'affiche en entier, en texte brut, retours à la ligne compris, sans débordement horizontal.
  - **Note** : aucun `innerHTML` dans l'application (vérifié par recherche). Le rendu d'un motif de 10 000 caractères est vérifié dans le navigateur en T051.

- [x] **T045** — Tests frontend : détail et confirmation
  - Fichiers : `pj/detail/detail.component.spec.ts`, `pj/detail/confirmation-action.component.spec.ts`, `pj/detail/motif-rejet.spec.ts`
  - Dépend de : T040, T041, T042, T044
  - Couvre : CA1.3, CA1.4, CA2.2, CA2.3, CA2.7, CA3.2, CA6.1, CA6.2 (côté interface) ; cas limites « erreur réseau », « conflit », « double clic »
  - Terminé quand : `ng test` passe et couvre :
    - **affichage des actions** : 5 boutons ; un bouton indisponible porte `aria-disabled` et une explication reliée, et un clic dessus n'ouvre rien ;
    - **confirmation** : Annuler n'envoie aucune requête ; un rejet sans motif ou avec 10 001 caractères affiche un message relié au champ, sans requête ; le champ motif est absent pour suspendre, reprendre et réouvrir ;
    - **retours du serveur** : en cas de succès, le statut, l'historique et l'annonce `role="status"` sont mis à jour ; en cas d'erreur réseau, la boîte reste ouverte et le motif est conservé ; en cas de `409 PJ_MODIFIEE`, le message s'affiche avec le détail à jour ;
    - **double clic** : le bouton est désactivé pendant l'envoi.
  - **Note** : `ng test` : 42 tests, 42 passent (21 nouveaux). jsdom ne fournit pas `HTMLDialogElement.showModal()` : les tests passent par l'ouverture de secours (attribut `open`) ; le piégeage du focus et Échap natifs sont vérifiés dans le navigateur (T050).

- [x] **T046** — Tests frontend : synchronisation de la liste
  - Fichiers : `pj/liste/liste.component.spec.ts`
  - Dépend de : T043
  - Couvre : CA1.1, CA2.1, CA3.1, CA4.1, CA5.1 (statut dans la liste) ; non-régression filtre, tri et recherche
  - Terminé quand : `ng test` passe et vérifie qu'après `pieceModifiee`, la ligne affiche le nouveau statut et que le filtre, le tri et la recherche actifs sont conservés.
  - **Note** : `ng test` : 43 tests, 43 passent.

---

## Lot 5 — Accessibilité, vérification finale, clôture

- [x] **T050** — Vérification accessibilité (RGAA AA)
  - Fichiers : transverse (corrections éventuelles dans les templates et `styles.css`)
  - Dépend de : T045, T046
  - Couvre : exigence non fonctionnelle « Accessibilité » (spec, section 6 ; constitution, articles IV et V)
  - Terminé quand : vérifié dans le navigateur réel, au clavier seul :
    - les 5 parcours (S1 à S5) se font sans souris, le focus entre dans la boîte puis revient au bouton déclencheur, et une action indisponible et son explication sont atteignables ;
    - le changement de statut et les erreurs sont exposés par une région live et `role="alert"` ;
    - les contrastes des boutons, de l'état `aria-disabled` et de la boîte de dialogue sont mesurés au moins à 4,5:1 pour le texte (3:1 pour les contours), et toute non-conformité est corrigée et notée ici.
  - **Note** : vérifié dans le navigateur réel (backend 4310, frontend 4200).

    **Clavier :**
    - Tab parcourt les 5 actions, y compris les indisponibles (`aria-disabled`, focalisables) ;
    - Entrée sur « Rejeter » ouvre la boîte (`:modal` vrai) avec le focus dans le champ du motif ;
    - Échap ferme la boîte et rend le focus à « Rejeter » ;
    - Tab reste piégé dans la boîte ;
    - un motif fait d'espaces affiche « Le motif du rejet est obligatoire. » (`role="alert"`), le champ passe `aria-invalid="true"` et `aria-describedby="motif-aide motif-erreur"`, et rien n'est enregistré.

    **Contrastes mesurés** (calcul WCAG sur les couleurs calculées) :
    - erreur du motif 7,8:1 ;
    - aide du motif 8,86:1 ;
    - bouton principal 8,4:1 au repos, 11,23:1 au survol ;
    - boutons secondaires 8,31:1 ;
    - bouton indisponible 7,78:1 ;
    - explication 8,49:1 ;
    - annonce de statut 7,22:1 ;
    - bordure du champ invalide 5,62:1 (seuil 3:1).

    Aucune non-conformité, aucune correction nécessaire. Limite connue (déjà notée en 001, T050) : l'outil d'automatisation simule mal l'enchaînement rapide d'Entrée et de la saisie ; une séquence a dû être rejouée pas à pas, sans défaut applicatif constaté.

- [x] **T051** — Vérification croisée finale et non-régression
  - Fichiers : — (vérification, aucun fichier modifié)
  - Dépend de : T013, T023, T024, T032, T050
  - Couvre : CA1.1 à CA6.2 (rejeu global)
  - Terminé quand : `npx tsc --noEmit` et `npm test` (backend), `ng build` et `npx ng test --watch=false` (frontend) passent tous. Backend et frontend lancés, chaque CA de la spec est rejoué une fois dans le navigateur, notamment :
    - les 5 actions sur les PJ de démonstration ;
    - un rejet sans motif, puis avec un motif de 10 000 caractères ;
    - deux onglets avec une action périmée dans l'un, qui affiche le message de conflit ;
    - un redémarrage du backend en mode « sans traitement » (`STUB_SANS_HABILITATION_TRAITEMENT=true`), qui montre les actions désactivées avec explication ;
    - un redémarrage normal, qui ramène l'état de démonstration.
  - **Note** : **Contrôles automatiques :**
    - backend : `npx tsc --noEmit` OK, `npm test` 63/63 ;
    - frontend : `ng build` OK (avec l'avertissement de budget, voir T041), `ng test` 9 fichiers, 43/43.

    **Rejoué dans le navigateur réel :**
    - S1 sur PJ-2026-0002 : statut « Validée », annonce « Statut mis à jour : Validée. », entrée « Gestionnaire de démonstration » sans motif, focus rendu au bouton, actions recalculées (CA1.1–CA1.3, CA6.1) ;
    - conflit : réouverture faite par l'API, puis « Réouvrir » dans l'interface avec l'ancienne version. Résultat : message « modifiée entre-temps », état à jour affiché, aucune entrée ajoutée (décision n° 8) ;
    - S2 : rejet avec un motif de 10 000 caractères contenant des retours à la ligne et `<b>`. Le motif est enregistré et affiché à l'identique (10 000 caractères), le `<b>` reste du texte, les retours à la ligne sont conservés, sans débordement horizontal (CA2.1–CA2.5) ;
    - motif vide refusé (CA2.2, T050) ;
    - S5, S3, S4 : réouvrir, suspendre, reprendre, sans champ de motif, avec les motifs automatiques exacts (CA3.1–CA3.3, CA4.1–CA4.2, CA5.1–CA5.3) ;
    - liste : filtre « Validée + Suspendue » et recherche « mandat » actifs, PJ-2026-0005 validée depuis le détail. Au retour, la ligne affiche « Validée », le filtre et la recherche sont intacts, sans rechargement (CA1.1, D7) ;
    - backend relancé avec `STUB_SANS_HABILITATION_TRAITEMENT=true` : retour à l'état de démonstration, les 5 actions sont `aria-disabled` avec « Indisponible : habilitation « Traitement des PJ » requise. », un clic n'ouvre rien, un `POST` direct renvoie 403 et l'historique est inchangé (CA6.2, cas « redémarrage ») ;
    - console : seulement le 409 et le 403 provoqués volontairement.

    **Couvert par les tests automatisés plutôt que rejoué :** annulation sans effet (CA1.4, CA2.7), erreur réseau avec motif conservé, double envoi simultané.

    **Outillage :** les serveurs de prévisualisation ont été déclarés dans `formation-ia/.claude/launch.json` (dossier parent, hors dépôt).

    Les écarts éventuels sont notés sous la tâche.

- [x] **T052** — Clôture documentaire
  - Fichiers : `CLAUDE.md`, `specs/README.md`
  - Dépend de : T051
  - Couvre : — (clôture ; parade au risque « identité simulée » du plan, section 8)
  - Terminé quand : la section « État actuel » de `CLAUDE.md` décrit la 003 (nombre de tâches, résultats des tests, vérification navigateur) et rappelle que l'auteur des actions repose sur l'identité simulée (risque accepté, décision n° 10) ; `specs/README.md` range la 003 parmi les fonctionnalités livrées.

---

## Couverture des critères d'acceptation

| CA | Tâches |
|----|--------|
| CA1.1 | T022, T023, T042, T043, T046, T051 |
| CA1.2 | T012, T023, T042, T051 |
| CA1.3 | T010, T013, T022, T023, T040, T045, T051 |
| CA1.4 | T041, T045, T051 |
| CA2.1 | T022, T023, T042, T043, T046, T051 |
| CA2.2 | T011, T013, T020, T023, T041, T045, T051 |
| CA2.3 | T011, T013, T020, T023, T041, T045, T051 |
| CA2.4 | T044, T051 |
| CA2.5 | T012, T023, T042, T051 |
| CA2.6 | T010, T022, T023, T040, T051 |
| CA2.7 | T041, T045, T051 |
| CA3.1 | T022, T023, T042, T043, T046, T051 |
| CA3.2 | T041, T045, T051 |
| CA3.3 | T010, T012, T013, T023, T051 |
| CA3.4 | T010, T022, T023, T040, T051 |
| CA4.1 | T022, T023, T042, T043, T046, T051 |
| CA4.2 | T010, T012, T013, T023, T042, T051 |
| CA4.3 | T010, T022, T023, T040, T051 |
| CA5.1 | T022, T023, T042, T043, T046, T051 |
| CA5.2 | T010, T012, T013, T023, T042, T051 |
| CA5.3 | T010, T013, T021, T023, T051 |
| CA5.4 | T010, T022, T023, T040, T051 |
| CA6.1 | T010, T013, T021, T022, T023, T040, T045, T051 |
| CA6.2 | T002, T010, T013, T021, T022, T023, T040, T045, T051 |

Cas limites de la section 5 de la spec : action interdite (T022, T023, T040,
T042) ; utilisateur sans traitement (T002, T021, T023, T040) ; concurrence
(T022, T024, T042) ; erreur réseau (T042, T045) ; double déclenchement
(T024, T042, T045) ; balisage dans le motif (T044) ; redémarrage (T003,
T051). Exigences non fonctionnelles : sécurité (T020, T022, T023) ;
historisation (T003, T012, T013) ; accessibilité (T040, T041, T050) ;
non-régression (T003, T030, T043, T046, T051).

Aucun critère d'acceptation sans tâche.

---

## Suivi

| Lot | Tâches | Terminées | État |
|-----|--------|-----------|------|
| 0   | T001–T003 | 3/3 | Terminé |
| 1   | T010–T013 | 4/4 | Terminé |
| 2   | T020–T024 | 5/5 | Terminé |
| 3   | T030–T032 | 3/3 | Terminé |
| 4   | T040–T046 | 7/7 | Terminé |
| 5   | T050–T052 | 3/3 | Terminé |
