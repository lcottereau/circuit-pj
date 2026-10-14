import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PieceJustificativeDetail, StatutPJ } from '../data/pieces-justificatives.js';
import {
  ACTIONS_PJ,
  MOTIF_REJET_LONGUEUR_MAX,
  actionAutorisee,
  appliquerAction,
  disponibilites,
  motifAutomatique,
  statutAtteint,
  verifierMotifRejet,
  type ActionPJ,
  type CommandeAction,
} from './traitement-pj.js';

const MAINTENANT = new Date('2026-10-14T10:00:00Z');

/** Matrice attendue, recopiée de la spec 003, section 4 bis. */
const MATRICE_SPEC: Record<StatutPJ, Record<ActionPJ, boolean>> = {
  NonValidee: { valider: true, rejeter: true, suspendre: true, reprendre: false, reouvrir: false },
  EnCoursValidation: { valider: true, rejeter: true, suspendre: true, reprendre: false, reouvrir: false },
  Validee: { valider: false, rejeter: false, suspendre: false, reprendre: false, reouvrir: true },
  Refusee: { valider: false, rejeter: false, suspendre: false, reprendre: false, reouvrir: true },
  Suspendue: { valider: true, rejeter: true, suspendre: false, reprendre: true, reouvrir: false },
};

function piece(statut: StatutPJ, version = 0): PieceJustificativeDetail {
  return {
    reference: 'PJ-TEST',
    libelle: 'PJ de test',
    dateDepot: '2026-10-01',
    statut,
    version,
    historique: [
      { date: '2026-10-01T08:00:00Z', statut: 'NonValidee', auteur: 'M. Dupont' },
      { date: '2026-10-02T08:00:00Z', statut, auteur: 'Mme Rossi', motif: 'Motif initial' },
    ],
  };
}

function commande(action: ActionPJ, version = 0): CommandeAction {
  return action === 'rejeter' ? { action, version, motif: 'Motif de rejet' } : { action, version };
}

for (const [statut, ligne] of Object.entries(MATRICE_SPEC) as [StatutPJ, Record<ActionPJ, boolean>][]) {
  for (const action of ACTIONS_PJ) {
    const attendu = ligne[action];
    test(`matrice : ${action} depuis ${statut} → ${attendu ? 'autorisé' : 'refusé'} (CA6.1)`, () => {
      assert.equal(actionAutorisee(statut, action), attendu);
      const resultat = appliquerAction(piece(statut), commande(action), 'Agent', MAINTENANT);
      assert.equal(resultat.ok, attendu);
      if (!resultat.ok) assert.equal(resultat.erreur, 'TRANSITION_INTERDITE');
    });
  }
}

test('statut atteint par chaque action (décision n° 12)', () => {
  assert.equal(statutAtteint('valider'), 'Validee');
  assert.equal(statutAtteint('rejeter'), 'Refusee');
  assert.equal(statutAtteint('suspendre'), 'Suspendue');
  assert.equal(statutAtteint('reprendre'), 'EnCoursValidation');
  assert.equal(statutAtteint('reouvrir'), 'EnCoursValidation');
});

test('motifs automatiques exacts (CA3.3, CA4.2, CA5.2, décision n° 13)', () => {
  assert.equal(motifAutomatique('suspendre'), "Suspension demandée depuis l'écran de suivi");
  assert.equal(motifAutomatique('reprendre'), "Reprise demandée depuis l'écran de suivi");
  assert.equal(motifAutomatique('reouvrir'), "Réouverture demandée depuis l'écran de suivi");
  assert.equal(motifAutomatique('valider'), undefined);
});

test('motif de rejet vide ou blanc refusé (CA2.2)', () => {
  assert.equal(verifierMotifRejet(''), 'MOTIF_OBLIGATOIRE');
  assert.equal(verifierMotifRejet('   \n\t \r\n '), 'MOTIF_OBLIGATOIRE');
  const resultat = appliquerAction(
    piece('EnCoursValidation'),
    { action: 'rejeter', version: 0, motif: ' \n ' },
    'Agent',
    MAINTENANT,
  );
  assert.deepEqual(resultat, { ok: false, erreur: 'MOTIF_OBLIGATOIRE' });
});

test('motif de rejet de 10 000 caractères accepté intégralement, y compris hors BMP (CA2.3)', () => {
  assert.equal(MOTIF_REJET_LONGUEUR_MAX, 10000);
  const motif = '😀'.repeat(5000) + 'a\n'.repeat(2500);
  assert.equal([...motif].length, 10000);
  assert.equal(verifierMotifRejet(motif), null);
  const resultat = appliquerAction(
    piece('EnCoursValidation'),
    { action: 'rejeter', version: 0, motif },
    'Agent',
    MAINTENANT,
  );
  assert.ok(resultat.ok);
  assert.equal(resultat.piece.historique.at(-1)?.motif, motif);
});

test('motif de rejet de 10 001 caractères refusé (CA2.3)', () => {
  assert.equal(verifierMotifRejet('a'.repeat(10001)), 'MOTIF_TROP_LONG');
});

test('motif de rejet conservé tel que saisi, espaces compris (CA2.4)', () => {
  const resultat = appliquerAction(
    piece('NonValidee'),
    { action: 'rejeter', version: 0, motif: '  Montant erroné\nvoir ligne 3  ' },
    'Agent',
    MAINTENANT,
  );
  assert.ok(resultat.ok);
  assert.equal(resultat.piece.historique.at(-1)?.motif, '  Montant erroné\nvoir ligne 3  ');
});

test('une action ajoute une seule entrée, sans toucher aux précédentes, et incrémente la version (article III)', () => {
  const initiale = piece('Suspendue', 4);
  const copieAvant = structuredClone(initiale);
  const resultat = appliquerAction(initiale, commande('reprendre', 4), 'Agent', MAINTENANT);
  assert.ok(resultat.ok);
  assert.deepEqual(initiale, copieAvant, 'la PJ reçue n’est pas modifiée');
  assert.equal(resultat.piece.version, 5);
  assert.equal(resultat.piece.statut, 'EnCoursValidation');
  assert.equal(resultat.piece.historique.length, copieAvant.historique.length + 1);
  assert.deepEqual(resultat.piece.historique.slice(0, -1), copieAvant.historique);
  assert.deepEqual(resultat.piece.historique.at(-1), {
    date: '2026-10-14T10:00:00.000Z',
    statut: 'EnCoursValidation',
    auteur: 'Agent',
    motif: "Reprise demandée depuis l'écran de suivi",
  });
});

test('une validation n’enregistre aucun motif (CA1.2)', () => {
  const resultat = appliquerAction(piece('NonValidee'), commande('valider'), 'Agent', MAINTENANT);
  assert.ok(resultat.ok);
  assert.equal('motif' in resultat.piece.historique.at(-1)!, false);
});

test('version périmée refusée avant tout autre contrôle (décision n° 8)', () => {
  const resultat = appliquerAction(piece('EnCoursValidation', 2), commande('valider', 1), 'Agent', MAINTENANT);
  assert.deepEqual(resultat, { ok: false, erreur: 'PJ_MODIFIEE' });
});

test('une PJ validée puis réouverte peut de nouveau être validée ou rejetée (CA5.3)', () => {
  const reouverte = appliquerAction(piece('Validee'), commande('reouvrir'), 'Agent', MAINTENANT);
  assert.ok(reouverte.ok);
  assert.equal(reouverte.piece.statut, 'EnCoursValidation');
  const validee = appliquerAction(reouverte.piece, commande('valider', 1), 'Agent', MAINTENANT);
  assert.ok(validee.ok);
  assert.equal(validee.piece.statut, 'Validee');
  assert.equal(validee.piece.historique.length, 4);
});

test('disponibilités : 5 actions, raison d’habilitation prioritaire (CA6.2)', () => {
  const sansHabilitation = disponibilites('EnCoursValidation', false);
  assert.equal(sansHabilitation.length, 5);
  for (const d of sansHabilitation) {
    assert.deepEqual(d, { action: d.action, disponible: false, raison: 'HABILITATION_MANQUANTE' });
  }
  const validee = disponibilites('Validee', true);
  assert.deepEqual(
    validee.map((d) => [d.action, d.disponible, d.raison]),
    [
      ['valider', false, 'TRANSITION_INTERDITE'],
      ['rejeter', false, 'TRANSITION_INTERDITE'],
      ['suspendre', false, 'TRANSITION_INTERDITE'],
      ['reprendre', false, 'TRANSITION_INTERDITE'],
      ['reouvrir', true, undefined],
    ],
  );
});
