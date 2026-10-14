# Plan technique — Traiter une pièce justificative depuis l'écran de suivi

**Spec source** : `specs/003-traitement-pj/spec.md` (statut : Validée)
**Statut** : Validé
**Date** : 2026-10-14

> Ce document répond au **comment**. Il ne réinvente aucun besoin : tout ce
> qu'il construit doit se rattacher à un critère d'acceptation de la spec.

---

## 1. Conformité à la constitution

| Article | Respecté | Justification |
|---------|----------|---------------|
| I — Spec fait foi | Oui | Chaque composant est rattaché à un CA (section 2). Aucun besoin ajouté. |
| II — Habilitation explicite | Oui, avec réserve | Nouvelle habilitation nommée `TRAITEMENT_PJ` (« Traitement des PJ »), vérifiée **côté serveur** à chaque action (403), en plus de la consultation. Réserve héritée de la 001 : l'identité est simulée (risque accepté, décision n° 10 de la spec, D3 du plan 001). |
| III — Historisation non falsifiable | Oui, dans la limite de la spec | Le magasin n'expose qu'un ajout d'entrée, jamais de modification ni suppression ; auteur et date fixés par le serveur, jamais lus dans la requête (schéma strict). Pas de conservation au redémarrage : exclusion explicite de la spec (décision n° 11). |
| IV — Statut jamais ambigu | Oui | Les 5 actions sont toujours affichées ; une action indisponible est désactivée (`aria-disabled`) **avec son explication** visible et liée (D5). |
| V — Accessibilité RGAA | Oui | Boîte de confirmation `<dialog>` modale native (focus piégé, Échap), retour du focus sur le bouton déclencheur, région `role="status"` pour l'annonce du nouveau statut, erreurs liées au champ par `aria-describedby`. Vérification manuelle (section 7). |
| VI — Typage strict | Oui | Corps de requête validé par schéma Zod strict côté serveur (D3) ; réponse validée par Zod côté client (schéma détail étendu). |
| VII — Logique testée | Oui | Matrice de transition, statut atteint, motifs automatiques, validation du motif, contrôle de version et d'habilitation : fonctions pures du domaine backend, testées unitairement (25 couples). Le frontend n'embarque aucune règle de transition (D2). |
| VIII — Frugalité | Oui | Seule dépendance runtime ajoutée : Zod côté backend, déjà présent dans le projet (frontend, même version majeure) — justifiée en section 3. Pas de librairie de modale (`<dialog>` natif), pas de base de données. |

---

## 2. Vue d'ensemble

```
[Détail PJ (Angular)] --POST /api/pieces-justificatives/:ref/actions--> [Route Express]
        |  boutons d'action pilotés par detail.actions                     | 1. habilitations (consultation, traitement)
        |  <dialog> de confirmation (+ motif si rejet)                     | 2. schéma Zod strict du corps
        |                                                                  | 3. PJ existe ?
        |  réponse = détail à jour                                         | 4. version attendue == version courante ?
        v                                                                  | 5. matrice autorise l'action ?
[Liste] met à jour la ligne en place (filtre/tri/recherche conservés)     | 6. appliquerAction() -> nouvelle PJ (+1 entrée, version+1)
                                                                           v
                                                         magasin en mémoire (ajout seul)
```

Rattachement des composants :

| Composant | Fichier(s) | CA couverts |
|-----------|-----------|-------------|
| Domaine de transition (pur) | `backend/src/domain/traitement-pj.ts` | CA1.1, CA1.3, CA2.1–CA2.3, CA2.6, CA3.1, CA3.3, CA3.4, CA4.1–CA4.3, CA5.1–CA5.4, CA6.1 |
| Habilitation `TRAITEMENT_PJ` | `backend/src/auth/current-user.stub.ts` | CA6.2 |
| Magasin mutable, ajout seul, réinitialisable | `backend/src/data/pieces-justificatives.ts` | CA1.2, CA2.5, CA3.3, CA4.2, CA5.2, cas « redémarrage » |
| Route d'action + schéma du corps | `backend/src/routes/pieces-justificatives.ts`, `backend/src/routes/commande-action.schema.ts` | CA2.2, CA2.3, CA6.1, CA6.2, cas « concurrence », « double clic » |
| Détail enrichi (`version`, `actions`) | GET détail existant | CA6.1 (cohérence interface / serveur), CA6.2 |
| Boutons d'action + explication | `frontend/.../detail/detail.component.*` | CA1.3, CA2.6, CA3.4, CA4.3, CA5.4, CA6.1, CA6.2 |
| Boîte de confirmation | `frontend/.../detail/confirmation-action.component.*` | CA1.4, CA2.2, CA2.3, CA2.7, CA3.2, cas « erreur réseau » |
| Mise à jour de la liste | `frontend/.../liste/liste.component.ts` | CA1.1, CA2.1, CA3.1, CA4.1, CA5.1 (« dans la liste sans rechargement »), non-régression filtre/tri/recherche |
| Affichage du motif | `detail.component.html` + CSS | CA2.4, cas « balisage dans le motif » |

---

## 3. Stack et dépendances

| Dépendance | Rôle | Poids | Alternative écartée et pourquoi |
|------------|------|-------|----------------------------------|
| Zod (backend, `^4.4.3`, même version que le frontend) | Valider le corps de la commande d'action (article VI) | Faible, déjà dans le projet | Validation manuelle : union discriminée sur 5 actions + règles du motif + rejet des champs inconnus (dont `auteur`) ≈ 40 lignes à maintenir en double avec le frontend ; Zod est déjà la convention du projet (plan 001, section 3). |
| `<dialog>` HTML natif | Boîte de confirmation modale | Aucun | Angular CDK / Material : écartés par cohérence avec D4 du plan 001 ; `showModal()` fournit nativement le piégeage du focus, Échap et l'inertie du fond. |
| Aucune base de données | — | — | Décision n° 11 de la spec : pas de persistance requise. |

---

## 4. Modèle de données

Inchangé : `StatutPJ`, `PieceJustificative`, `HistoriqueEntree` (motif optionnel).

Ajouts :

| Type / champ | Type | Obligatoire | Source |
|--------------|------|-------------|--------|
| `ActionPJ` | `'valider' \| 'rejeter' \| 'suspendre' \| 'reprendre' \| 'reouvrir'` | — | Domaine |
| `PieceJustificativeDetail.version` | entier ≥ 0 | Oui | Serveur ; 0 dans le jeu initial, +1 à chaque action réussie (D4) |
| `PieceJustificativeDetail.actions` | `DisponibiliteAction[]` (5 éléments, toujours tous présents) | Oui | Calculé par le serveur à chaque lecture (D2) |
| `DisponibiliteAction.action` | `ActionPJ` | Oui | |
| `DisponibiliteAction.disponible` | booléen | Oui | matrice ∧ habilitation |
| `DisponibiliteAction.raison` | `'TRANSITION_INTERDITE' \| 'HABILITATION_MANQUANTE'` | Si `disponible = false` | Habilitation prioritaire sur la transition |

Règles du domaine (constantes dans `traitement-pj.ts`) :
- Matrice : celle de la section 4 bis de la spec, codée telle quelle en table
  `Record<StatutPJ, ReadonlySet<ActionPJ>>`.
- Statut atteint : valider → `Validee`, rejeter → `Refusee`, suspendre → `Suspendue`,
  reprendre / réouvrir → `EnCoursValidation`.
- Motifs automatiques : textes exacts de la décision n° 13 ; valider : aucun motif ;
  rejeter : motif saisi.
- Motif de rejet : refusé si `trim()` vide ; plafond `MOTIF_REJET_LONGUEUR_MAX = 10 000`
  **points de code** (`[...motif].length`, pas `.length` UTF-16, pour garantir
  10 000 caractères même avec des caractères hors BMP). Plafond = seuil garanti.
  Le motif est enregistré tel que saisi (pas de `trim` du contenu enregistré).

---

## 5. Contrats d'interface

### `GET /api/pieces-justificatives/:reference` (modifié)

Réponse `200` : détail existant **+ `version` + `actions`**. Codes 403 / 404 inchangés.
`GET /api/pieces-justificatives` (liste) : inchangé.

### `POST /api/pieces-justificatives/:reference/actions` (nouveau)

Corps (objet strict, tout champ inconnu → 400, notamment `auteur` ou `date`) :
```json
{ "action": "rejeter", "version": 3, "motif": "…" }   // motif requis pour rejeter
{ "action": "valider", "version": 3 }                  // motif interdit pour les autres actions
```

Ordre des contrôles et réponses :

| # | Contrôle | Réponse si échec |
|---|----------|------------------|
| 1 | Habilitation consultation | `403 HABILITATION_MANQUANTE` |
| 2 | Habilitation « Traitement des PJ » | `403 HABILITATION_MANQUANTE` (message nommant « Traitement des PJ ») |
| 3 | Schéma du corps | `400 REQUETE_INVALIDE` ; `400 MOTIF_OBLIGATOIRE` ; `400 MOTIF_TROP_LONG` (message avec la longueur max) |
| 4 | PJ existe | `404 PJ_INCONNUE` |
| 5 | `version` == version courante | `409 PJ_MODIFIEE` + `pieceActuelle` (détail à jour) dans le corps |
| 6 | Matrice autorise l'action pour le statut courant | `409 TRANSITION_INTERDITE` |
| — | Succès | `200` + détail à jour (nouvelle version, nouvelle entrée d'historique, `actions` recalculées) |

Les contrôles 4 à 6 et l'écriture sont exécutés de façon **synchrone**, sans
`await` intermédiaire : la boucle d'événements Node garantit qu'aucune autre
requête ne s'intercale (D4). Auteur = `utilisateurCourant().nom`, date =
horloge serveur (ISO 8601).

Côté client, la réponse (succès ou `pieceActuelle`) est validée par
`PieceJustificativeDetailSchema` étendu. `ErreurApi` s'enrichit de :
`conflit` (409 PJ_MODIFIEE, porte le détail à jour), `transition`,
`validation` (400, porte le code), en plus de `habilitation`, `introuvable`, `reseau`.

---

## 6. Décisions d'architecture

### D1 — Un seul point d'entrée d'action, commande typée

- **Contexte** : 5 actions aux contrôles identiques (habilitation, version, matrice).
- **Options** : (a) une route par action (`/valider`, `/rejeter`…) ; (b) une route
  `POST …/actions` avec une union discriminée sur `action`.
- **Décision** : (b).
- **Conséquences acceptées** : une seule chaîne de contrôles, testée une fois pour
  toutes les actions ; journaux HTTP moins parlants (l'action est dans le corps).

### D2 — Disponibilité des actions calculée par le serveur

- **Contexte** : CA6.1 exige que l'interface et le système donnent le même verdict
  pour les 25 couples ; CA6.2 exige d'afficher l'habilitation manquante ; l'article VII
  interdit toute règle métier dans un composant de rendu.
- **Options** : (a) recopier la matrice dans le frontend + exposer les habilitations
  de l'utilisateur ; (b) le détail renvoie `actions[]` (disponible + raison) calculé
  par la même fonction que celle qui contrôle le POST.
- **Décision** : (b).
- **Conséquences acceptées** : le frontend ne fait qu'afficher ; une seule source de
  vérité, cohérence garantie par construction. Le serveur reste juge final (un
  `actions[]` périmé côté client est rattrapé par le contrôle de version).

### D3 — Zod côté backend pour le corps des commandes

- **Contexte** : première donnée entrante en écriture ; article VI.
- **Options** : (a) validation écrite à la main ; (b) Zod, déjà utilisé au frontend.
- **Décision** : (b), avec `z.strictObject` (rejette `auteur`, `date`, etc.).
- **Conséquences acceptées** : une dépendance runtime backend de plus (section 3).
  Le plafond du motif est dupliqué en constante côté frontend pour l'aide à la
  saisie ; le serveur reste l'autorité (risque de dérive, section 8).

### D4 — Concurrence par numéro de version (verrouillage optimiste)

- **Contexte** : décision n° 8 — refuser la seconde action « même si elle reste
  autorisée dans le nouveau statut » ; cas limite « double clic ».
- **Options** : (a) le client envoie le statut qu'il a vu ; (b) le client envoie la
  `version` qu'il a vue, incrémentée à chaque action.
- **Décision** : (b). (a) laisse passer le cas « suspendue puis reprise entre-temps »
  (même statut, PJ pourtant modifiée).
- **Conséquences acceptées** : le client doit toujours renvoyer la version lue ; en
  cas de 409, il affiche le détail à jour renvoyé par le serveur. Le double clic est
  bloqué deux fois : bouton de confirmation désactivé pendant l'envoi, et seconde
  requête refusée par la version.

### D5 — Actions indisponibles : `aria-disabled` plutôt que `disabled`

- **Contexte** : article IV (désactivée **avec explication**) et article V (le lecteur
  d'écran doit pouvoir atteindre l'explication).
- **Options** : (a) `disabled` natif (bouton retiré de l'ordre de tabulation,
  explication inaccessible au clavier) ; (b) `aria-disabled="true"`, bouton focalisable,
  clic sans effet, explication visible reliée par `aria-describedby`.
- **Décision** : (b). Libellés d'explication : « Indisponible : la pièce est
  <statut> » ; « Indisponible : habilitation « Traitement des PJ » requise ».
- **Conséquences acceptées** : le style « désactivé » est porté par
  `[aria-disabled='true']` dans `styles.css`, contraste AA à vérifier.

### D6 — Magasin en mémoire, ajout seul, réinitialisable

- **Contexte** : décision n° 11 (pas de persistance) ; article III ; les tests
  d'écriture ne doivent pas se contaminer entre eux.
- **Décision** : le jeu fixe devient une **graine** ; le magasin en est une copie
  profonde (`structuredClone`). Fonctions exposées : lecture (copies), `remplacerPiece`
  appelée uniquement par la route après `appliquerAction` (qui construit un nouvel
  historique = ancien + 1 entrée), et `reinitialiserPiecesJustificatives()` pour les
  tests. Aucune fonction ne modifie ni ne retire une entrée existante.
- **Conséquences acceptées** : état perdu au redémarrage (voulu par la spec).

### D7 — Synchronisation détail → liste par événement

- **Contexte** : le nouveau statut doit apparaître « dans la liste sans rechargement
  manuel », filtre/tri/recherche conservés ; la liste est masquée pendant le détail.
- **Options** : (a) recharger toute la liste à la fermeture du détail ; (b) le détail
  émet `pieceModifiee` (résumé) et la liste remplace la ligne correspondante dans
  `piecesBrutes`.
- **Décision** : (b) ; émis aussi après un 409 `PJ_MODIFIEE` (détail à jour reçu).
- **Conséquences acceptées** : les changements faits par d'autres utilisateurs sur
  d'autres PJ n'apparaissent qu'au prochain chargement de la liste (hors spec).

---

## 7. Stratégie de test

**Unitaire backend (`node:test`)** — `backend/src/domain/traitement-pj.test.ts` :
- les 25 couples (statut, action) : autorisé / refusé conforme à la matrice (CA6.1) ;
- statut atteint et motif automatique exact par action (CA3.3, CA4.2, CA5.2) ;
- motif de rejet : vide, espaces + retours à la ligne → refusé ; 10 000 points de code
  (dont caractères hors BMP) → accepté intégralement ; 10 001 → refusé (CA2.2, CA2.3) ;
- `appliquerAction` : entrées antérieures strictement inchangées, une seule entrée
  ajoutée, version + 1 (CA5.2, article III) ;
- `disponibilites` : raison `HABILITATION_MANQUANTE` prioritaire (CA6.2).

**Route backend (`node:test`, `reinitialiserPiecesJustificatives()` avant chaque test)** :
- succès valider / rejeter / suspendre / reprendre / réouvrir : 200, statut, entrée
  (auteur = utilisateur simulé, motif attendu), version + 1 ;
- sans habilitation traitement (`STUB_SANS_HABILITATION_TRAITEMENT=true`) : 403,
  PJ et historique inchangés (relus par GET) ; GET détail : 5 actions indisponibles
  raison habilitation, consultation intacte (CA6.2) ;
- 400 : action inconnue, version absente, motif absent/vide pour rejeter, motif trop
  long, champ `auteur` fourni ;
- 404 référence inconnue ; 409 `TRANSITION_INTERDITE` (valider une PJ validée, CA1.3) ;
- 409 `PJ_MODIFIEE` : version périmée, y compris scénario suspendre → reprendre puis
  ancienne version ; deux POST simultanés avec la même version → un 200, un 409, une
  seule entrée ajoutée (cas concurrence et double clic) ;
- GET détail : `actions` cohérent avec la matrice pour chacune des 5 PJ de démo.

**Unitaire frontend (Vitest)** :
- service : mapping 400 / 403 / 404 / 409 (`conflit` avec détail validé, `transition`) ;
- détail : 5 boutons ; indisponible → `aria-disabled` + texte d'explication relié ;
  clic sur indisponible n'ouvre rien ;
- confirmation : annuler n'appelle pas le service (CA1.4, CA2.7) ; rejet sans motif →
  message lié au champ, pas d'appel (CA2.2) ; suspendre/reprendre/réouvrir sans champ
  motif (CA3.2) ; erreur réseau → boîte reste ouverte, motif conservé ; bouton
  désactivé pendant l'envoi ;
- succès → statut et historique mis à jour, `pieceModifiee` émis, annonce `role="status"` ;
- liste : `pieceModifiee` remplace la ligne, filtre/tri/recherche conservés.

**Vérifié manuellement (navigateur, backend + frontend lancés)** :
- parcours S1 à S5 au clavier seul ; focus dans la boîte puis retour au bouton ;
- annonce du nouveau statut et des erreurs au lecteur d'écran ;
- contrastes AA des boutons, état `aria-disabled` et boîte de dialogue ;
- motif de rejet de 10 000 caractères avec retours à la ligne et `<b>` : affiché
  intégralement, en texte, retours à la ligne conservés (`white-space: pre-line`,
  `overflow-wrap: anywhere`) ;
- deux onglets : action dans l'un, action périmée dans l'autre → message « modifiée
  entre-temps » et détail à jour ;
- redémarrage du backend → retour à l'état de démonstration ;
- non-régression : tous les tests 001/002 passent (`npm test`, `npx tsc --noEmit`,
  `ng build`, `ng test`).

**Non couvert** : audit RGAA automatisé (aucun outil ajouté, comme en 001/002) ;
charge (volume faible, spec 001).

---

## 8. Risques

| Risque | Probabilité | Impact | Parade |
|--------|-------------|--------|--------|
| Identité simulée prise pour une vraie authentification ; l'auteur d'une validation n'est pas réellement prouvé | Moyenne | Élevé | Risque accepté (décision n° 10). Marqueur du stub conservé et étendu à `TRAITEMENT_PJ` ; mention dans `CLAUDE.md` à la livraison. |
| Dérive entre le plafond du motif côté client et serveur | Faible | Faible | Serveur autoritaire ; constante commentée des deux côtés renvoyant à la décision n° 14 ; test serveur sur la limite exacte. |
| Tests backend qui se contaminent via l'état en mémoire | Élevée sans parade | Moyen | `reinitialiserPiecesJustificatives()` dans `beforeEach` (D6). |
| `aria-disabled` mal compris (bouton focalisable mais inactif) | Moyenne | Faible | Explication textuelle visible à côté du bouton, pas seulement en info-bulle (D5). |
| Corps de requête volumineux | Faible | Faible | Limite par défaut d'`express.json` (100 ko) > 10 000 points de code UTF-8 (≤ 40 ko) ; au-delà : 413, traduit en erreur de validation côté client. |
| Écart hérité : le plan 001 annonçait Zod côté backend, non implémenté pour les GET | — | Faible | Signalé, non corrigé ici (le paramètre `:reference` n'est qu'une clé de recherche) ; hors périmètre 003. |
