# Spécification — Traiter une pièce justificative depuis l'écran de suivi

**Identifiant** : 003-traitement-pj
**Statut** : Validée
**Date** : 2026-10-14

> Ce document décrit **ce que** le système doit faire et **pourquoi**.
> Il ne contient aucun choix technique : pas de librairie, pas d'architecture,
> pas de nom de fonction. Ces sujets appartiennent à `plan.md`.

---

## 1. Problème

L'écran de suivi livré par la fonctionnalité 001 permet aux gestionnaires de
voir où en est chaque pièce justificative (PJ), mais pas d'agir dessus. Pour
valider, rejeter ou suspendre une PJ, ils doivent aujourd'hui quitter cet
écran et passer par un autre outil, puis revenir sur l'écran de suivi pour
constater le résultat. Plusieurs gestionnaires ont demandé à pouvoir traiter
une PJ directement depuis la vue où ils la consultent.

Cette fonctionnalité ajoute au détail d'une PJ, sur l'écran de suivi, les
actions de traitement : valider, rejeter (avec motif obligatoire), suspendre,
reprendre une PJ suspendue et réouvrir une PJ validée ou refusée, dans le
respect de règles de transition de statut explicites et d'un contrôle
d'habilitation.

## 2. Utilisateurs visés

Gestionnaires comptables d'une collectivité territoriale, déjà utilisateurs
de l'écran de suivi (fonctionnalité 001), en poste de travail bureau.
Utilisateurs métier réguliers, non informaticiens.

Habilitations :
- la consultation reste soumise à l'habilitation existante « Consultation des
  circuits de validation PJ » ;
- toutes les actions de traitement (valider, rejeter, suspendre, reprendre,
  réouvrir) sont soumises à une habilitation unique, nommée
  **« Traitement des PJ »** (décision n° 1). Traiter une PJ suppose aussi de
  pouvoir la consulter : un utilisateur sans l'habilitation de consultation
  n'a pas accès à l'écran, comme aujourd'hui.

## 3. Périmètre exclu

- Pas de système d'authentification réel : la fonctionnalité s'appuie sur
  l'identité utilisateur simulée existante (décision n° 10). Elle est donc
  réservée à un usage démonstratif, comme la fonctionnalité 001.
- Pas d'écran de gestion des habilitations (attribution, retrait,
  administration des droits).
- Pas de conservation des actions après un redémarrage de l'application : au
  redémarrage, les PJ et leur historique reviennent à leur état initial de
  démonstration (décision n° 11).
- Pas de séparation des tâches : un utilisateur peut traiter une PJ quel
  qu'en soit le déposant, y compris lui-même (décision n° 9).
- Pas d'action directement sur les lignes de la liste : les actions sont
  proposées uniquement dans le détail d'une PJ (décision n° 6).
- Pas de traitement de plusieurs PJ en une seule action (traitement par lot).
- Pas d'action faisant passer une PJ de « Non validée » à « En cours de
  validation » (mise en circuit) : seules les actions listées en section 4
  bis sont couvertes.
- Pas de passage par un parapheur électronique ni de signature de la PJ.
- Pas de transmission de la PJ validée au comptable public.
- Pas de notification (courriel ou autre) après une action.
- Pas de modification ni de suppression d'une entrée d'historique existante
  (constitution, article III). Réouvrir une PJ ajoute une entrée ; cela
  n'efface pas la validation ou le refus précédent.

## 4. Scénarios utilisateur

Règles communes à tous les scénarios ci-dessous :
- Les actions sont proposées dans le détail de la PJ uniquement.
- Toute action exige une confirmation explicite avant d'être enregistrée
  (décision n° 7). Annuler la confirmation ne modifie ni le statut ni
  l'historique.
- Toute action n'aboutit que si la matrice de transition (section 4 bis)
  l'autorise pour le statut courant, et si l'utilisateur dispose de
  l'habilitation « Traitement des PJ ».
- Toute action réussie produit exactement une nouvelle entrée d'historique
  portant : la date et l'heure de l'action, le statut atteint, l'auteur
  (l'utilisateur ayant effectué l'action) et, le cas échéant, le motif.
- Après une action réussie, le statut courant affiché dans le détail et dans
  la liste est mis à jour sans rechargement manuel de l'écran, et le filtre,
  le tri et la recherche en cours sont conservés.

### S1 — Valider une pièce justificative · Priorité : Haute

**En tant que** gestionnaire comptable habilité, **je veux** valider une PJ
depuis le détail, **afin de** la faire avancer dans le circuit sans changer
d'outil.

Déroulé nominal :
1. Le gestionnaire ouvre le détail d'une PJ depuis l'écran de suivi.
2. Le gestionnaire déclenche l'action « Valider ».
3. Le système demande une confirmation explicite.
4. Le gestionnaire confirme.
5. Le statut de la PJ passe à « Validée » ; une nouvelle entrée apparaît dans
   l'historique.

Critères d'acceptation :
- [ ] CA1.1 — Depuis « Non validée », « En cours de validation » ou
      « Suspendue », la validation confirmée fait passer la PJ à « Validée »,
      et le nouveau statut est affiché dans le détail et dans la liste sans
      rechargement manuel.
- [ ] CA1.2 — Après validation, l'historique comporte une nouvelle entrée
      avec la date et l'heure de l'action, le statut « Validée » et l'auteur.
- [ ] CA1.3 — Une PJ déjà « Validée » ne peut pas être validée à nouveau ;
      une PJ « Refusée » ne peut pas être validée sans avoir été réouverte.
      Dans ces cas, l'action est visiblement désactivée, avec une explication
      accessible (constitution, article IV). Une tentative qui contournerait
      l'interface est refusée par le système, sans modifier la PJ ni son
      historique.
- [ ] CA1.4 — Annuler la confirmation ne modifie ni le statut ni
      l'historique.

### S2 — Rejeter une pièce justificative avec un motif · Priorité : Haute

**En tant que** gestionnaire comptable habilité, **je veux** rejeter une PJ en
indiquant pourquoi, **afin que** le motif du refus soit connu et tracé.

Déroulé nominal :
1. Le gestionnaire ouvre le détail d'une PJ depuis l'écran de suivi.
2. Le gestionnaire déclenche l'action « Rejeter ».
3. Le système demande la saisie d'un motif.
4. Le gestionnaire saisit le motif et confirme.
5. Le statut de la PJ passe à « Refusée » ; une nouvelle entrée, portant le
   motif, apparaît dans l'historique.

Critères d'acceptation :
- [ ] CA2.1 — Depuis « Non validée », « En cours de validation » ou
      « Suspendue », le rejet confirmé avec un motif valide fait passer la PJ
      à « Refusée », et le nouveau statut est affiché dans le détail et dans
      la liste sans rechargement manuel.
- [ ] CA2.2 — Le rejet est impossible sans motif : un motif vide ou composé
      uniquement d'espaces et de retours à la ligne est refusé, avec un
      message d'erreur explicite associé au champ de saisie. Il n'y a pas
      d'autre longueur minimale.
- [ ] CA2.3 — Les motifs très longs sont acceptés (décision n° 5) : un motif
      de 10 000 caractères est accepté, enregistré et réaffiché
      intégralement, sans troncature (décision n° 14). Un plafond technique
      protège le système contre des saisies démesurées ; il n'est jamais
      inférieur à 10 000 caractères. Au-delà du plafond, la saisie est refusée avec un message explicite
      indiquant la longueur maximale.
- [ ] CA2.4 — Le motif est réaffiché dans l'historique tel que saisi, retours
      à la ligne compris (comportement CA3.2 de la fonctionnalité 001).
- [ ] CA2.5 — Après rejet, l'historique comporte une nouvelle entrée avec la
      date et l'heure, le statut « Refusée », l'auteur et le motif.
- [ ] CA2.6 — Une PJ « Validée » ou déjà « Refusée » ne peut pas être
      rejetée sans avoir été réouverte ; règles de désactivation et de refus
      identiques à CA1.3.
- [ ] CA2.7 — Annuler la saisie ou la confirmation ne modifie ni le statut ni
      l'historique.

### S3 — Suspendre une pièce justificative · Priorité : Moyenne

**En tant que** gestionnaire comptable habilité, **je veux** suspendre une PJ,
**afin de** la mettre en attente sans la valider ni la refuser.

Déroulé nominal :
1. Le gestionnaire ouvre le détail d'une PJ depuis l'écran de suivi.
2. Le gestionnaire déclenche l'action « Suspendre ».
3. Le système demande une confirmation explicite.
4. Le gestionnaire confirme. Il ne saisit pas de motif : le motif est
   renseigné automatiquement par le système (décision n° 4).
5. Le statut de la PJ passe à « Suspendue » ; une nouvelle entrée apparaît
   dans l'historique.

Critères d'acceptation :
- [ ] CA3.1 — Depuis « Non validée » ou « En cours de validation », la
      suspension confirmée fait passer la PJ à « Suspendue », et le nouveau
      statut est affiché dans le détail et dans la liste sans rechargement
      manuel.
- [ ] CA3.2 — Aucun champ de motif n'est présenté à l'utilisateur pour une
      suspension.
- [ ] CA3.3 — Après suspension, l'historique comporte une nouvelle entrée
      avec la date et l'heure, le statut « Suspendue », l'auteur et le motif
      automatique « Suspension demandée depuis l'écran de suivi »
      (décision n° 13).
- [ ] CA3.4 — Une PJ déjà « Suspendue », « Validée » ou « Refusée » ne peut
      pas être suspendue ; règles de désactivation et de refus identiques à
      CA1.3.

### S4 — Reprendre une pièce justificative suspendue · Priorité : Moyenne

**En tant que** gestionnaire comptable habilité, **je veux** reprendre une PJ
suspendue, **afin de** la remettre dans le circuit de validation.

Déroulé nominal :
1. Le gestionnaire ouvre le détail d'une PJ « Suspendue ».
2. Le gestionnaire déclenche l'action « Reprendre ».
3. Le système demande une confirmation explicite.
4. Le gestionnaire confirme.
5. Le statut de la PJ passe à « En cours de validation », quel que soit son
   statut avant la suspension (décision n° 12) ; une nouvelle entrée
   apparaît dans l'historique.

Critères d'acceptation :
- [ ] CA4.1 — Depuis « Suspendue », la reprise confirmée fait passer la PJ à
      « En cours de validation », affiché dans le détail et dans la liste
      sans rechargement manuel.
- [ ] CA4.2 — Après reprise, l'historique comporte une nouvelle entrée avec
      la date et l'heure, le statut « En cours de validation », l'auteur et
      le motif automatique « Reprise demandée depuis l'écran de suivi ».
- [ ] CA4.3 — L'action « Reprendre » est visiblement désactivée, avec
      explication, pour toute PJ qui n'est pas « Suspendue » ; une tentative
      contournant l'interface est refusée par le système.

### S5 — Réouvrir une pièce justificative validée ou refusée · Priorité : Moyenne

**En tant que** gestionnaire comptable habilité, **je veux** réouvrir une PJ
validée ou refusée, **afin de** pouvoir la traiter à nouveau.

Déroulé nominal :
1. Le gestionnaire ouvre le détail d'une PJ « Validée » ou « Refusée ».
2. Le gestionnaire déclenche l'action « Réouvrir ».
3. Le système demande une confirmation explicite.
4. Le gestionnaire confirme.
5. Le statut de la PJ passe à « En cours de validation » (décision
   n° 12) ; une nouvelle entrée apparaît dans l'historique.
   Les entrées antérieures (dont la validation ou le refus) restent
   inchangées.

Critères d'acceptation :
- [ ] CA5.1 — Depuis « Validée » ou « Refusée », la réouverture confirmée
      fait passer la PJ à « En cours de validation », affiché dans le détail
      et dans la liste sans rechargement manuel.
- [ ] CA5.2 — Après réouverture, l'historique comporte une nouvelle entrée
      avec la date et l'heure, le statut « En cours de validation »,
      l'auteur et le motif automatique « Réouverture demandée depuis l'écran
      de suivi » ; aucune entrée antérieure n'est modifiée ni supprimée.
- [ ] CA5.3 — Après réouverture, les actions autorisées sont celles du statut
      atteint (section 4 bis) : une PJ validée puis réouverte peut de nouveau
      être validée ou rejetée.
- [ ] CA5.4 — L'action « Réouvrir » est visiblement désactivée, avec
      explication, pour toute PJ qui n'est ni « Validée » ni « Refusée » ;
      une tentative contournant l'interface est refusée par le système.

### 4 bis. Règles de transition de statut

Matrice validée (décision n° 2 et n° 3). « Oui » : action autorisée ;
« Non » : action visiblement désactivée avec explication, et refusée par le
système si elle est tentée.

| Statut courant ↓ / Action → | Valider | Rejeter | Suspendre | Reprendre | Réouvrir |
|------------------------------|---------|---------|-----------|-----------|----------|
| Non validée                  | Oui     | Oui     | Oui       | Non       | Non      |
| En cours de validation       | Oui     | Oui     | Oui       | Non       | Non      |
| Validée                      | Non     | Non     | Non       | Non       | Oui      |
| Refusée                      | Non     | Non     | Non       | Non       | Oui      |
| Suspendue                    | Oui     | Oui     | Non       | Oui       | Non      |

Statut atteint par chaque action : Valider → « Validée » ; Rejeter →
« Refusée » ; Suspendre → « Suspendue » ; Reprendre et Réouvrir → « En
cours de validation » (décision n° 12).

Motif de chaque action : Rejeter → motif saisi par l'utilisateur,
obligatoire ; Suspendre, Reprendre et Réouvrir → motif automatique, sans
saisie (décision n° 13) : respectivement « Suspension demandée depuis
l'écran de suivi », « Reprise demandée depuis l'écran de suivi »,
« Réouverture demandée depuis l'écran de suivi » ; Valider → aucun motif.

Critère d'acceptation transverse :
- [ ] CA6.1 — Pour chacun des 25 couples (statut courant, action) de la
      matrice, le système accepte ou refuse l'action conformément à la
      matrice, et l'interface présente l'action comme disponible ou
      visiblement désactivée en cohérence avec ce même résultat.
- [ ] CA6.2 — Sans l'habilitation « Traitement des PJ », toutes les actions
      sont visiblement désactivées avec la mention de l'habilitation
      manquante, quel que soit le statut, et toute tentative contournant
      l'interface est refusée par le système sans modifier la PJ ni son
      historique. La consultation (liste et détail) reste inchangée.

## 5. Cas limites et erreurs

| Situation | Comportement attendu |
|-----------|----------------------|
| Action interdite dans le statut courant (ex. valider une PJ déjà validée) | L'action est visiblement désactivée avec explication. Toute tentative qui atteint quand même le système est refusée avec un message explicite ; ni le statut ni l'historique ne changent. |
| Utilisateur avec l'habilitation de consultation mais sans « Traitement des PJ » | Il voit la liste et le détail comme aujourd'hui ; les actions sont visiblement désactivées avec la mention de l'habilitation manquante. |
| Deux gestionnaires agissent sur la même PJ presque simultanément | La seconde action est refusée (décision n° 8) : un message explique que la PJ a été modifiée entre-temps, le statut et l'historique à jour sont affichés, et aucune entrée d'historique n'est créée pour l'action refusée. Ce refus s'applique même si la seconde action reste autorisée par la matrice dans le nouveau statut. |
| Erreur réseau ou serveur pendant l'action | Message d'erreur explicite ; l'écran n'affiche pas un statut qui n'a pas été réellement enregistré ; le motif de rejet déjà saisi n'est pas perdu et l'action peut être relancée. |
| Double déclenchement involontaire (double clic sur la confirmation) | Une seule action est enregistrée ; une seule entrée d'historique est créée. |
| Motif de rejet contenant des caractères spéciaux, des retours à la ligne ou du balisage | Le motif est enregistré et réaffiché tel que saisi, en texte, sans jamais être interprété comme du contenu actif. |
| Redémarrage de l'application après des actions | Les PJ et leur historique reviennent à leur état initial de démonstration (décision n° 11). Comportement attendu, pas une anomalie. |

## 6. Exigences non fonctionnelles

- **Sécurité — habilitation** : chaque action de traitement est contrôlée par
  le système lui-même, indépendamment de ce que montre l'interface
  (constitution, article II). Désactiver un bouton ne constitue pas un
  contrôle.
- **Sécurité — identité de l'auteur** : l'auteur inscrit dans l'historique
  est déterminé par le système à partir de l'utilisateur courant, jamais
  fourni par l'interface. Cet utilisateur courant reste l'identité simulée
  existante (décision n° 10) : **risque accepté**, la fonctionnalité n'est pas
  utilisable au-delà d'un usage démonstratif tant qu'une authentification
  réelle n'existe pas.
- **Historisation** : chaque action réussie produit exactement une entrée
  d'historique ; une action refusée ou en échec n'en produit aucune. Les
  entrées existantes ne sont jamais modifiées ni supprimées, y compris lors
  d'une réouverture (constitution, article III). Cette garantie vaut pour la
  durée de vie de l'application ; la non-conservation au redémarrage est une
  exclusion assumée (section 3).
- **Accessibilité** : les actions, la saisie du motif et les confirmations
  sont entièrement utilisables au clavier ; à l'ouverture d'une confirmation
  le focus y est placé, et à sa fermeture il revient sur l'action qui l'a
  ouverte ; le changement de statut et les messages d'erreur sont annoncés
  aux lecteurs d'écran ; une action désactivée expose son explication aux
  technologies d'assistance (RGAA niveau AA, constitution articles IV et V).
- **Non-régression** : les comportements des fonctionnalités 001 et 002
  (liste, filtre, tri, recherche, détail, habillage) restent inchangés, et
  leurs tests passent toujours.

## 7. Points à clarifier

| # | Question | Décision | Date |
|---|----------|----------|------|
| 1 | Habilitation unique « Traitement des PJ » ou une habilitation par action ? | Habilitation unique « Traitement des PJ », couvrant toutes les actions (option la plus simple). | 2026-10-14 |
| 2 | Matrice des transitions : traitement possible depuis « Non validée » ? depuis « Suspendue » ? « Validée » et « Refusée » sont-ils définitifs ? | Valider, rejeter et suspendre possibles depuis « Non validée » ; valider et rejeter possibles depuis « Suspendue ». « Validée » et « Refusée » ne sont pas définitifs : action « Réouvrir ». Matrice en section 4 bis. | 2026-10-14 |
| 3 | Une PJ suspendue peut-elle être reprise dans cette version ? | Oui : action « Reprendre » (S4). | 2026-10-14 |
| 4 | Motif de suspension : obligatoire, facultatif ou absent ? | Motif renseigné automatiquement par le système, sans saisie par l'utilisateur. Texte exact : voir point 13. | 2026-10-14 |
| 5 | Motif de rejet : longueur maximale ou minimale ? | Les motifs très longs doivent être acceptés ; pas de longueur minimale au-delà du refus d'un motif vide. Seuil garanti : voir point 14. | 2026-10-14 |
| 6 | Où les actions sont-elles proposées ? | Dans le détail de la PJ uniquement. | 2026-10-14 |
| 7 | Confirmation explicite exigée pour quelles actions ? | Pour toutes les actions, systématiquement. | 2026-10-14 |
| 8 | Actions concurrentes : refuser la seconde action si le statut a changé entre-temps ? | Oui, la seconde action est refusée. | 2026-10-14 |
| 9 | Séparation des tâches ? | Non, pas de séparation des tâches. | 2026-10-14 |
| 10 | Identité de l'auteur : identité simulée ou authentification réelle prérequise ? | Livraison avec l'identité simulée existante, usage démonstratif ; risque accepté. | 2026-10-14 |
| 11 | Persistance après redémarrage ? | Non requise. | 2026-10-14 |
| 12 | Statut atteint après « Reprendre » (depuis « Suspendue ») et après « Réouvrir » (depuis « Validée » ou « Refusée ») : toujours « En cours de validation », retour au statut précédent, ou « Non validée » ? Proposition : « En cours de validation » dans les deux cas. | « En cours de validation » dans les deux cas, quel que soit le statut antérieur. | 2026-10-14 |
| 13 | Texte exact du motif automatique de suspension, et « Reprendre » / « Réouvrir » portent-ils aussi un motif automatique ? Proposition : « Suspension demandée depuis l'écran de suivi », « Reprise demandée depuis l'écran de suivi », « Réouverture demandée depuis l'écran de suivi ». | Proposition retenue : les trois actions portent un motif automatique, avec ces textes exacts. | 2026-10-14 |
| 14 | Seuil garanti pour la longueur d'un motif de rejet : 10 000 caractères vous convient-il ? | Oui : 10 000 caractères garantis ; plafond technique jamais inférieur. | 2026-10-14 |

## 8. Définition de terminé

La fonctionnalité est livrée quand tous les critères d'acceptation des
scénarios S1 et S2 (priorité Haute) et les critères transverses CA6.1 et
CA6.2 sont satisfaits et vérifiés, et que les tests des fonctionnalités 001
et 002 passent toujours. Les scénarios S3, S4 et S5 (priorité Moyenne) font
partie du périmètre mais peuvent être reportés par un arbitrage explicite
tracé ici avant clôture ; CA6.1 ne porte alors que sur les actions livrées.
