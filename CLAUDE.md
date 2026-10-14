# CircuitPJ — instructions projet

Ce dépôt suit une méthode **Spec-Driven Development (SDD)**. C'est un projet
pédagogique : il sert à illustrer la méthode auprès d'équipes de développement,
pas à livrer un produit réel.

Lis la constitution avant toute action : `.specify/memory/constitution.md`.

## Contexte fonctionnel

CircuitPJ est une application fictive inspirée du domaine de la gestion
financière publique : le suivi des **circuits de validation des pièces
justificatives (PJ)** dans une collectivité territoriale (mandats, factures,
bordereaux). Une pièce justificative transite par un circuit de validation
avant d'être transmise au comptable public — avec des statuts (non validée, en
cours de validation, validée, refusée, suspendue), des habilitations par
fonctionnalité, et parfois un passage par un parapheur électronique.

> Ce projet ne reproduit le code, les données ni l'architecture d'aucun
> logiciel client. Il s'inspire uniquement du vocabulaire et des règles
> métier génériques de ce type de workflow pour servir de terrain
> d'entraînement à la méthode SDD.

## Règle d'or

**Aucun code n'est écrit sans spec validée.** Si on te demande d'implémenter
une fonctionnalité qui n'a pas de `spec.md` approuvé dans `specs/`, ne code
pas : propose de lancer `/specify` d'abord.

## Cycle de travail

Quatre phases, chacune produisant un livrable relu et validé par un humain
avant de passer à la suivante :

| Phase | Commande     | Produit                          | Question à laquelle il répond |
|-------|--------------|-----------------------------------|-------------------------------|
| 1     | `/specify`   | `specs/<id>-<slug>/spec.md`      | Quoi et pourquoi              |
| 2     | `/plan`      | `specs/<id>-<slug>/plan.md`      | Comment, techniquement        |
| 3     | `/tasks`     | `specs/<id>-<slug>/tasks.md`     | Dans quel ordre               |
| 4     | `/implement` | Le code                          | —                              |

Ne saute jamais une phase. Ne fusionne jamais deux phases dans une même
réponse.

## Discipline de spécification

- Une spec décrit **le comportement observable**, jamais l'implémentation.
  Pas de nom de librairie, pas de nom de fonction, pas de schéma de base dans
  un `spec.md`.
- Toute ambiguïté est marquée `[À CLARIFIER: question précise]` plutôt que
  tranchée en silence. Une hypothèse implicite est une dette.
- Tout critère d'acceptation est vérifiable : une machine ou un relecteur doit
  pouvoir statuer sans débat.

## Discipline d'implémentation

- On implémente **une tâche à la fois**, dans l'ordre de `tasks.md`.
- Chaque tâche terminée est cochée dans `tasks.md` dans la foulée.
- Si une tâche s'avère impossible ou mal définie, on s'arrête et on remonte
  le problème à la spec ou au plan. On n'improvise pas.

## État actuel

- Constitution : rédigée (v1.0.0).
- **Fonctionnalité 001** (`specs/001-suivi-circuit-pj/`) : cycle complet
  spec → plan → tasks → implémentation. **25/25 tâches terminées
  (2026-08-24).** `npx tsc --noEmit` (backend), `npm test` (backend, 6
  tests), `ng build` et `ng test` (frontend, 12 tests) passent tous.
  **Vérifié dans un navigateur réel**, backend et frontend lancés
  ensemble : liste, statuts en toutes lettres, date absente explicite,
  filtre par statut, tri, recherche temps réel insensible casse/accents,
  détail avec historique et motif conditionnel, conservation d'état à la
  fermeture du détail.
- Écart corrigé pendant l'implémentation : le plan prévoyait Jasmine/Karma
  pour les tests frontend ; le CLI Angular 22 utilise Vitest par défaut —
  documenté dans `plan.md` (sections 3 et 7) plutôt que corrigé
  silencieusement.
- Point ouvert, signalé et non résolu : le contrôle d'habilitation (CA1.6)
  s'appuie sur une identité utilisateur simulée
  (`backend/src/auth/current-user.stub.ts`, plan.md décision D3) — aucune
  fonctionnalité d'authentification réelle n'existe encore. Ne pas
  utiliser au-delà d'un usage pédagogique/démonstratif.
- **Fonctionnalité 002** (`specs/002-habillage-visuel/`) : habillage visuel
  de l'écran livré par la 001, sans changement de comportement. **14/14
  tâches terminées (2026-08-24).** Identité visuelle volontairement
  neutre et générique, sans marque (jetons CSS dans `frontend/src/styles.css`,
  logo `frontend/public/img/logo.svg`, pile de polices système — voir
  `plan.md` décisions D1 à D4). Contraste AA mesuré : deux échecs réels
  trouvés et corrigés (badge de statut « validée », message d'erreur — voir
  `tasks.md` T022). Non-régression vérifiée : les 18 tests de la
  fonctionnalité 001 passent toujours.
- **Fonctionnalité 003** (`specs/003-traitement-pj/`) : valider, rejeter
  (motif obligatoire, jusqu'à 10 000 caractères), suspendre, reprendre et
  réouvrir une PJ depuis le détail de l'écran de suivi. **25/25 tâches
  terminées (2026-10-14).** Habilitation unique « Traitement des PJ »
  contrôlée côté serveur ; disponibilité des actions calculée par le
  serveur et seulement affichée par l'interface (plan D2) ; concurrence
  gérée par numéro de version (D4, 409 `PJ_MODIFIEE`) ; historique en ajout
  seul garanti par le magasin. `npx tsc --noEmit` et `npm test` (backend,
  63 tests), `ng build` et `ng test` (frontend, 43 tests) passent.
  **Vérifié dans un navigateur réel** (S1 à S5, conflit, motif de 10 000
  caractères, mode sans habilitation de traitement, clavier, contrastes —
  voir `tasks.md` T050 et T051).
- **Risque accepté, à ne pas oublier** : l'auteur inscrit dans l'historique
  lors d'un traitement provient de l'identité **simulée**
  (`backend/src/auth/current-user.stub.ts`, désormais aussi pour
  l'habilitation « Traitement des PJ », désactivable par
  `STUB_SANS_HABILITATION_TRAITEMENT=true`). Une validation n'est donc pas
  réellement imputable à une personne (spec 003, décision n° 10). Les
  actions ne survivent pas à un redémarrage du backend (décision n° 11).
- Points ouverts signalés pendant la 003, non traités :
  - `ng build` émet un avertissement de budget (bundle initial ≈ 511 ko
    pour un budget de 500 ko, sous le seuil d'erreur) — le budget n'a pas
    été modifié ;
  - le plan 001 annonçait Zod côté backend aux frontières ; seule la route
    d'écriture de la 003 l'utilise, les `GET` de la 001 ne valident pas
    leur paramètre `:reference`.
- Prochaine fonctionnalité : à spécifier avec `/specify` (numéro `004`).

## Lancer l'application

- Backend : `cd backend && npm run dev` — écoute sur `http://127.0.0.1:4310`.
- Frontend : `cd frontend && npm start` — sert sur `http://localhost:4200`,
  proxy `/api` vers le backend (`frontend/proxy.conf.json`). Lancer le
  backend en premier.

## Contexte technique retenu

- Frontend : Angular (TypeScript strict).
- Backend : Node.js / Express (TypeScript).
- Persistance : non figée ici — c'est une décision de `plan.md`, à trancher
  fonctionnalité par fonctionnalité selon le besoin réel.
