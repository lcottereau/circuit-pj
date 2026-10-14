import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../app.js';
import { reinitialiserPiecesJustificatives } from '../data/pieces-justificatives.js';

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
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('GET /api/pieces-justificatives renvoie 403 sans habilitation (CA1.6)', async () => {
  process.env.STUB_SANS_HABILITATION = 'true';
  try {
    const res = await fetch(`${baseUrl}/api/pieces-justificatives`);
    assert.equal(res.status, 403);
  } finally {
    delete process.env.STUB_SANS_HABILITATION;
  }
});

test('GET /api/pieces-justificatives renvoie 200 avec la forme attendue (CA1.1)', async () => {
  const res = await fetch(`${baseUrl}/api/pieces-justificatives`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0);
  for (const piece of body) {
    assert.equal(typeof piece.reference, 'string');
    assert.equal(typeof piece.libelle, 'string');
    assert.ok(piece.dateDepot === null || typeof piece.dateDepot === 'string');
    assert.equal(typeof piece.statut, 'string');
    assert.equal(piece.historique, undefined, 'le résumé ne doit pas exposer l’historique');
  }
});

test('GET /api/pieces-justificatives/:reference renvoie 404 sur référence inconnue', async () => {
  const res = await fetch(`${baseUrl}/api/pieces-justificatives/INCONNUE-000`);
  assert.equal(res.status, 404);
});

test('GET /api/pieces-justificatives/:reference renvoie 403 sans habilitation (CA1.6)', async () => {
  process.env.STUB_SANS_HABILITATION = 'true';
  try {
    const res = await fetch(`${baseUrl}/api/pieces-justificatives/PJ-2026-0001`);
    assert.equal(res.status, 403);
  } finally {
    delete process.env.STUB_SANS_HABILITATION;
  }
});

test('GET /api/pieces-justificatives/:reference renvoie 200 avec un historique vide explicite (CA3.1, CA3.3)', async () => {
  const res = await fetch(`${baseUrl}/api/pieces-justificatives/PJ-2026-0003`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.reference, 'PJ-2026-0003');
  assert.ok(Array.isArray(body.historique));
  assert.equal(body.historique.length, 0);
});

test('GET /api/pieces-justificatives/:reference renvoie un motif quand il existe (CA3.2)', async () => {
  const res = await fetch(`${baseUrl}/api/pieces-justificatives/PJ-2026-0004`);
  assert.equal(res.status, 200);
  const body = await res.json();
  const entreeRefus = body.historique.find((h: { statut: string }) => h.statut === 'Refusee');
  assert.equal(entreeRefus.motif, 'Pièce jointe manquante');

  const entreeSansMotif = body.historique.find((h: { statut: string }) => h.statut === 'NonValidee');
  assert.equal(entreeSansMotif.motif, undefined);
});
