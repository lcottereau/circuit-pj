import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListeComponent } from './liste.component';
import type { PieceJustificative } from '../pieces-justificative.schema';
import type { PieceJustificativeDetail } from '../piece-justificative-detail.schema';

/** Disponibilités d'actions minimales pour les jeux de test (spec 003). */
const ACTIONS_INDISPONIBLES: PieceJustificativeDetail['actions'] = (
  ['valider', 'rejeter', 'suspendre', 'reprendre', 'reouvrir'] as const
).map((action) => ({ action, disponible: false, raison: 'TRANSITION_INTERDITE' as const }));

const PIECES: PieceJustificative[] = [
  { reference: 'PJ-A', libelle: 'Facture électricité', dateDepot: '2026-08-01', statut: 'Validee' },
  {
    reference: 'PJ-B',
    libelle: 'Mandat travaux',
    dateDepot: '2026-08-05',
    statut: 'EnCoursValidation',
  },
  { reference: 'PJ-C', libelle: 'Facture eau', dateDepot: null, statut: 'NonValidee' },
];

describe('ListeComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ListeComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function creerComposant() {
    const fixture = TestBed.createComponent(ListeComponent);
    httpMock.expectOne('/api/pieces-justificatives').flush(PIECES);
    fixture.detectChanges();
    return fixture;
  }

  function referencesAffichees(fixture: ReturnType<typeof creerComposant>): (string | null)[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).map(
      (tr) => tr.querySelector('td')!.textContent?.trim() ?? null,
    );
  }

  it('affiche une date de dépôt absente de façon explicite (CA1.5)', () => {
    const fixture = creerComposant();
    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('Date de dépôt non renseignée');
  });

  it('filtre la liste par statut (CA1.3)', () => {
    const fixture = creerComposant();
    fixture.componentInstance.changerStatutsFiltres(new Set(['Validee']));
    fixture.detectChanges();
    expect(referencesAffichees(fixture)).toEqual(['PJ-A']);
  });

  it('trie par date de dépôt et inverse le sens sans recharger la page (CA1.4)', () => {
    const fixture = creerComposant();
    expect(referencesAffichees(fixture)).toEqual(['PJ-B', 'PJ-A', 'PJ-C']);

    fixture.componentInstance.basculerSensTri();
    fixture.detectChanges();
    expect(referencesAffichees(fixture)).toEqual(['PJ-A', 'PJ-B', 'PJ-C']);
  });

  it('conserve le filtre actif après fermeture du détail (CA3.4)', () => {
    const fixture = creerComposant();
    fixture.componentInstance.changerStatutsFiltres(new Set(['Validee']));
    fixture.detectChanges();
    expect(referencesAffichees(fixture)).toEqual(['PJ-A']);

    fixture.componentInstance.ouvrirDetail('PJ-A');
    fixture.detectChanges();
    httpMock.expectOne('/api/pieces-justificatives/PJ-A').flush({
      reference: 'PJ-A',
      libelle: 'Facture électricité',
      dateDepot: '2026-08-01',
      statut: 'Validee',
      version: 0,
      actions: ACTIONS_INDISPONIBLES,
      historique: [],
    });
    fixture.detectChanges();

    fixture.componentInstance.fermerDetail();
    fixture.detectChanges();

    expect(referencesAffichees(fixture)).toEqual(['PJ-A']);
  });

  it('répercute un changement de statut sans recharger, filtre, tri et recherche conservés (spec 003, D7)', () => {
    const fixture = creerComposant();
    fixture.componentInstance.changerStatutsFiltres(new Set(['EnCoursValidation', 'Validee']));
    fixture.componentInstance.changerTexteRecherche('a');
    fixture.componentInstance.basculerSensTri();
    fixture.detectChanges();
    expect(referencesAffichees(fixture)).toEqual(['PJ-A', 'PJ-B']);

    fixture.componentInstance.mettreAJourPiece({
      reference: 'PJ-B',
      libelle: 'Mandat travaux',
      dateDepot: '2026-08-05',
      statut: 'Validee',
    });
    fixture.detectChanges();

    httpMock.expectNone('/api/pieces-justificatives');
    expect(referencesAffichees(fixture)).toEqual(['PJ-A', 'PJ-B']);
    const ligneB = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).find(
      (tr) => tr.textContent?.includes('PJ-B'),
    )!;
    expect(ligneB.textContent).toContain('Validée');
    expect(ligneB.textContent).not.toContain('En cours de validation');

    fixture.componentInstance.mettreAJourPiece({
      reference: 'PJ-A',
      libelle: 'Facture électricité',
      dateDepot: '2026-08-01',
      statut: 'Suspendue',
    });
    fixture.detectChanges();
    expect(referencesAffichees(fixture)).toEqual(['PJ-B']);
  });
});
