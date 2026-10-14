import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PiecesJustificativesService, type ErreurApi } from './pieces-justificatives.service';
import type { PieceJustificativeDetail } from './piece-justificative-detail.schema';

const URL_ACTION = '/api/pieces-justificatives/PJ-1/actions';

const DETAIL: PieceJustificativeDetail = {
  reference: 'PJ-1',
  libelle: 'Facture',
  dateDepot: '2026-08-01',
  statut: 'Validee',
  version: 1,
  historique: [{ date: '2026-10-14T10:00:00Z', statut: 'Validee', auteur: 'Agent' }],
  actions: (['valider', 'rejeter', 'suspendre', 'reprendre', 'reouvrir'] as const).map((action) => ({
    action,
    disponible: action === 'reouvrir',
    ...(action === 'reouvrir' ? {} : { raison: 'TRANSITION_INTERDITE' as const }),
  })),
};

describe('PiecesJustificativesService — executerAction', () => {
  let service: PiecesJustificativesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PiecesJustificativesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function executerEtCapturer(): { succes?: PieceJustificativeDetail; erreur?: ErreurApi } {
    const resultat: { succes?: PieceJustificativeDetail; erreur?: ErreurApi } = {};
    service.executerAction('PJ-1', { action: 'valider', version: 0 }).subscribe({
      next: (detail) => (resultat.succes = detail),
      error: (erreur: ErreurApi) => (resultat.erreur = erreur),
    });
    return resultat;
  }

  it('envoie la commande et renvoie le détail validé (200)', () => {
    const resultat = executerEtCapturer();
    const requete = httpMock.expectOne(URL_ACTION);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ action: 'valider', version: 0 });
    requete.flush(DETAIL);
    expect(resultat.succes).toEqual(DETAIL);
  });

  it('rejette une réponse non conforme au schéma', () => {
    const resultat = executerEtCapturer();
    httpMock.expectOne(URL_ACTION).flush({ ...DETAIL, actions: [] });
    expect(resultat.succes).toBeUndefined();
    expect(resultat.erreur).toBeDefined();
  });

  it('traduit 400 en erreur de validation avec son code', () => {
    const resultat = executerEtCapturer();
    httpMock
      .expectOne(URL_ACTION)
      .flush({ code: 'MOTIF_OBLIGATOIRE', message: '…' }, { status: 400, statusText: 'Bad Request' });
    expect(resultat.erreur).toEqual({ type: 'validation', code: 'MOTIF_OBLIGATOIRE' });
  });

  it('traduit 413 en motif trop long', () => {
    const resultat = executerEtCapturer();
    httpMock.expectOne(URL_ACTION).flush('trop gros', { status: 413, statusText: 'Payload Too Large' });
    expect(resultat.erreur).toEqual({ type: 'validation', code: 'MOTIF_TROP_LONG' });
  });

  it('traduit 403 en défaut d’habilitation', () => {
    const resultat = executerEtCapturer();
    httpMock
      .expectOne(URL_ACTION)
      .flush({ code: 'HABILITATION_MANQUANTE' }, { status: 403, statusText: 'Forbidden' });
    expect(resultat.erreur).toEqual({ type: 'habilitation' });
  });

  it('traduit 404 en PJ introuvable', () => {
    const resultat = executerEtCapturer();
    httpMock.expectOne(URL_ACTION).flush({ code: 'PJ_INCONNUE' }, { status: 404, statusText: 'Not Found' });
    expect(resultat.erreur).toEqual({ type: 'introuvable' });
  });

  it('traduit 409 PJ_MODIFIEE en conflit portant la PJ à jour', () => {
    const resultat = executerEtCapturer();
    httpMock
      .expectOne(URL_ACTION)
      .flush({ code: 'PJ_MODIFIEE', pieceActuelle: DETAIL }, { status: 409, statusText: 'Conflict' });
    expect(resultat.erreur).toEqual({ type: 'conflit', pieceActuelle: DETAIL });
  });

  it('traduit 409 TRANSITION_INTERDITE en transition refusée', () => {
    const resultat = executerEtCapturer();
    httpMock
      .expectOne(URL_ACTION)
      .flush({ code: 'TRANSITION_INTERDITE' }, { status: 409, statusText: 'Conflict' });
    expect(resultat.erreur).toEqual({ type: 'transition' });
  });
});
