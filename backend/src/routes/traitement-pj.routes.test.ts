import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../app.js';
import { reinitialiserPiecesJustificatives } from '../data/pieces-justificatives.js';
import { ACTIONS_PJ, actionAutorisee } from '../domain/traitement-pj.js';

let server: Server;
let baseUrl: string;

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Adresse de serveur de test inattendue');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  reinitialiserPiecesJustificatives();
  delete process.env.STUB_SANS_HABILITATION;
  delete process.env.STUB_SANS_HABILITATION_TRAITEMENT;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

interface EntreeApi {
  date: string;
  statut: string;
  auteur: string;
  motif?: string;
}

interface DetailApi {
  reference: string;
  statut: string;
  version: number;
  historique: EntreeApi[];
  actions: { action: string; disponible: boolean; raison?: string }[];
}

async function lireDetail(reference: string): Promise<DetailApi> {
  const res = await fetch(`${baseUrl}/api/pieces-justificatives/${reference}`);
  assert.equal(res.status, 200);
  return (await res.json()) as DetailApi;
}

function agir(reference: string, corps: unknown): Promise<Response> {
  return fetch(`${baseUrl}/api/pieces-justificatives/${reference}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const AUTEUR_SIMULE = 'Gestionnaire de démonstration';

/** Une PJ de démonstration par statut de départ (graine du magasin). */
const PJ_PAR_STATUT = {
  Validee: 'PJ-2026-0001',
  EnCoursValidation: 'PJ-2026-0002',
  NonValidee: 'PJ-2026-0003',
  Refusee: 'PJ-2026-0004',
  Suspendue: 'PJ-2026-0005',
} as const;

const SUCCES = [
  { action: 'valider', reference: PJ_PAR_STATUT.EnCoursValidation, statut: 'Validee', motif: undefined },
  { action: 'rejeter', reference: PJ_PAR_STATUT.NonValidee, statut: 'Refusee', motif: 'Montant erroné' },
  {
    action: 'suspendre',
    reference: PJ_PAR_STATUT.EnCoursValidation,
    statut: 'Suspendue',
    motif: "Suspension demandée depuis l'écran de suivi",
  },
  {
    action: 'reprendre',
    reference: PJ_PAR_STATUT.Suspendue,
    statut: 'EnCoursValidation',
    motif: "Reprise demandée depuis l'écran de suivi",
  },
  {
    action: 'reouvrir',
    reference: PJ_PAR_STATUT.Validee,
    statut: 'EnCoursValidation',
    motif: "Réouverture demandée depuis l'écran de suivi",
  },
] as const;

for (const cas of SUCCES) {
  test(`POST ${cas.action} sur ${cas.reference} : 200, statut, entrée d'historique, version + 1`, async () => {
    const avant = await lireDetail(cas.reference);
    const corps = cas.action === 'rejeter'
      ? { action: cas.action, version: avant.version, motif: cas.motif }
      : { action: cas.action, version: avant.version };
    const res = await agir(cas.reference, corps);
    assert.equal(res.status, 200);
    const reponse = (await res.json()) as DetailApi;
    assert.equal(reponse.statut, cas.statut);
    assert.equal(reponse.version, avant.version + 1);
    assert.equal(reponse.actions.length, 5);

    const apres = await lireDetail(cas.reference);
    assert.equal(apres.statut, cas.statut);
    assert.equal(apres.historique.length, avant.historique.length + 1);
    assert.deepEqual(apres.historique.slice(0, -1), avant.historique);
    const entree = apres.historique.at(-1)!;
    assert.equal(entree.statut, cas.statut);
    assert.equal(entree.auteur, AUTEUR_SIMULE);
    assert.equal(entree.motif, cas.motif);
    assert.ok(!Number.isNaN(Date.parse(entree.date)));
  });
}

test('sans « Traitement des PJ » : 403, PJ inchangée, consultation intacte, actions indisponibles (CA6.2)', async () => {
  process.env.STUB_SANS_HABILITATION_TRAITEMENT = 'true';
  const avant = await lireDetail(PJ_PAR_STATUT.EnCoursValidation);
  const res = await agir(PJ_PAR_STATUT.EnCoursValidation, { action: 'valider', version: 0 });
  assert.equal(res.status, 403);
  const corps = (await res.json()) as { code: string; message: string };
  assert.equal(corps.code, 'HABILITATION_MANQUANTE');
  assert.match(corps.message, /Traitement des PJ/);

  const apres = await lireDetail(PJ_PAR_STATUT.EnCoursValidation);
  assert.deepEqual(apres, avant);
  assert.equal((await fetch(`${baseUrl}/api/pieces-justificatives`)).status, 200);
  for (const d of apres.actions) {
    assert.equal(d.disponible, false);
    assert.equal(d.raison, 'HABILITATION_MANQUANTE');
  }
});

test('sans consultation : 403 sur l’action', async () => {
  process.env.STUB_SANS_HABILITATION = 'true';
  const res = await agir(PJ_PAR_STATUT.EnCoursValidation, { action: 'valider', version: 0 });
  assert.equal(res.status, 403);
});

const INVALIDES = [
  { nom: 'action inconnue', corps: { action: 'supprimer', version: 0 }, code: 'REQUETE_INVALIDE' },
  { nom: 'version absente', corps: { action: 'valider' }, code: 'REQUETE_INVALIDE' },
  { nom: 'champ auteur fourni', corps: { action: 'valider', version: 0, auteur: 'Pirate' }, code: 'REQUETE_INVALIDE' },
  { nom: 'motif pour une validation', corps: { action: 'valider', version: 0, motif: 'x' }, code: 'REQUETE_INVALIDE' },
  { nom: 'motif de rejet absent', corps: { action: 'rejeter', version: 0 }, code: 'MOTIF_OBLIGATOIRE' },
  { nom: 'motif de rejet blanc', corps: { action: 'rejeter', version: 0, motif: ' \n ' }, code: 'MOTIF_OBLIGATOIRE' },
  {
    nom: 'motif de rejet de 10 001 caractères',
    corps: { action: 'rejeter', version: 0, motif: 'a'.repeat(10001) },
    code: 'MOTIF_TROP_LONG',
  },
] as const;

for (const cas of INVALIDES) {
  test(`400 ${cas.code} : ${cas.nom}, PJ inchangée (CA2.2, CA2.3)`, async () => {
    const avant = await lireDetail(PJ_PAR_STATUT.EnCoursValidation);
    const res = await agir(PJ_PAR_STATUT.EnCoursValidation, cas.corps);
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, cas.code);
    assert.deepEqual(await lireDetail(PJ_PAR_STATUT.EnCoursValidation), avant);
  });
}

test('motif de rejet de 10 000 caractères accepté et relu intégralement (CA2.3)', async () => {
  const motif = 'é'.repeat(9991) + '<b>x</b>\n';
  assert.equal([...motif].length, 10000);
  const res = await agir(PJ_PAR_STATUT.EnCoursValidation, { action: 'rejeter', version: 0, motif });
  assert.equal(res.status, 200);
  const apres = await lireDetail(PJ_PAR_STATUT.EnCoursValidation);
  assert.equal(apres.historique.at(-1)!.motif, motif);
});

test('404 sur une référence inconnue', async () => {
  const res = await agir('PJ-INCONNUE', { action: 'valider', version: 0 });
  assert.equal(res.status, 404);
});

test('409 TRANSITION_INTERDITE : valider une PJ déjà validée, sans effet (CA1.3)', async () => {
  const avant = await lireDetail(PJ_PAR_STATUT.Validee);
  const res = await agir(PJ_PAR_STATUT.Validee, { action: 'valider', version: avant.version });
  assert.equal(res.status, 409);
  assert.equal(((await res.json()) as { code: string }).code, 'TRANSITION_INTERDITE');
  assert.deepEqual(await lireDetail(PJ_PAR_STATUT.Validee), avant);
});

test('actions du détail cohérentes avec la matrice pour les 5 PJ de démonstration (CA6.1)', async () => {
  for (const [statut, reference] of Object.entries(PJ_PAR_STATUT)) {
    const detail = await lireDetail(reference);
    assert.equal(detail.statut, statut);
    for (const action of ACTIONS_PJ) {
      const d = detail.actions.find((a) => a.action === action);
      assert.ok(d, `${reference} : action ${action} absente`);
      const autorisee = actionAutorisee(detail.statut as keyof typeof PJ_PAR_STATUT, action);
      assert.equal(d.disponible, autorisee, `${reference} / ${action}`);
      if (!autorisee) assert.equal(d.raison, 'TRANSITION_INTERDITE');
    }
  }
});

test('409 PJ_MODIFIEE : version périmée, avec la PJ à jour dans la réponse (décision n° 8)', async () => {
  const reference = PJ_PAR_STATUT.EnCoursValidation;
  assert.equal((await agir(reference, { action: 'suspendre', version: 0 })).status, 200);

  const res = await agir(reference, { action: 'valider', version: 0 });
  assert.equal(res.status, 409);
  const corps = (await res.json()) as { code: string; pieceActuelle: DetailApi };
  assert.equal(corps.code, 'PJ_MODIFIEE');
  assert.equal(corps.pieceActuelle.statut, 'Suspendue');
  assert.equal(corps.pieceActuelle.version, 1);
  assert.equal((await lireDetail(reference)).historique.length, 3);
});

test('409 PJ_MODIFIEE même si le statut est revenu à l’identique (suspendre puis reprendre)', async () => {
  const reference = PJ_PAR_STATUT.EnCoursValidation;
  assert.equal((await agir(reference, { action: 'suspendre', version: 0 })).status, 200);
  assert.equal((await agir(reference, { action: 'reprendre', version: 1 })).status, 200);
  assert.equal((await lireDetail(reference)).statut, 'EnCoursValidation');

  const res = await agir(reference, { action: 'valider', version: 0 });
  assert.equal(res.status, 409);
  assert.equal(((await res.json()) as { code: string }).code, 'PJ_MODIFIEE');
  assert.equal((await lireDetail(reference)).statut, 'EnCoursValidation');
});

test('deux envois simultanés avec la même version : un 200, un 409, une seule entrée (double clic, concurrence)', async () => {
  const reference = PJ_PAR_STATUT.EnCoursValidation;
  const avant = await lireDetail(reference);
  const reponses = await Promise.all([
    agir(reference, { action: 'valider', version: avant.version }),
    agir(reference, { action: 'rejeter', version: avant.version, motif: 'Concurrent' }),
  ]);
  const codes = reponses.map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 409]);
  const apres = await lireDetail(reference);
  assert.equal(apres.historique.length, avant.historique.length + 1);
  assert.equal(apres.version, avant.version + 1);
});
