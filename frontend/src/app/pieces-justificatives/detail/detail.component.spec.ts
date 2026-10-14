import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DetailComponent } from './detail.component';
import type { PieceJustificativeDetail } from '../piece-justificative-detail.schema';

/** Disponibilités d'actions minimales pour les jeux de test (spec 003). */
const ACTIONS_INDISPONIBLES: PieceJustificativeDetail['actions'] = (
  ['valider', 'rejeter', 'suspendre', 'reprendre', 'reouvrir'] as const
).map((action) => ({ action, disponible: false, raison: 'TRANSITION_INTERDITE' as const }));

describe('DetailComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function creerComposant(reference: string, detail: PieceJustificativeDetail) {
    const fixture = TestBed.createComponent(DetailComponent);
    fixture.componentRef.setInput('reference', reference);
    fixture.detectChanges();
    httpMock.expectOne(`/api/pieces-justificatives/${reference}`).flush(detail);
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le motif quand il existe, sans placeholder sinon (CA3.2)', () => {
    const fixture = creerComposant('PJ-2026-0004', {
      reference: 'PJ-2026-0004',
      libelle: 'Facture prestation',
      dateDepot: '2026-07-20',
      statut: 'Refusee',
      version: 0,
      actions: ACTIONS_INDISPONIBLES,
      historique: [
        { date: '2026-07-20T09:00:00Z', statut: 'NonValidee', auteur: 'M. Dupont' },
        {
          date: '2026-07-25T16:45:00Z',
          statut: 'Refusee',
          auteur: 'M. Lefevre',
          motif: 'Pièce jointe manquante',
        },
      ],
    });

    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('Pièce jointe manquante');

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items[0].textContent).not.toContain('motif');
    expect(items[1].textContent).toContain('motif');
  });

  it('indique explicitement l’absence d’historique (CA3.3)', () => {
    const fixture = creerComposant('PJ-2026-0003', {
      reference: 'PJ-2026-0003',
      libelle: 'Facture énergie',
      dateDepot: null,
      statut: 'NonValidee',
      version: 0,
      actions: ACTIONS_INDISPONIBLES,
      historique: [],
    });

    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('Aucun changement de statut enregistré');
    expect((fixture.nativeElement as HTMLElement).querySelector('ul')).toBeNull();
  });
});

describe('DetailComponent — actions de traitement (spec 003)', () => {
  let httpMock: HttpTestingController;

  const DISPONIBLES_EN_COURS: PieceJustificativeDetail['actions'] = [
    { action: 'valider', disponible: true },
    { action: 'rejeter', disponible: true },
    { action: 'suspendre', disponible: true },
    { action: 'reprendre', disponible: false, raison: 'TRANSITION_INTERDITE' },
    { action: 'reouvrir', disponible: false, raison: 'TRANSITION_INTERDITE' },
  ];

  const EN_COURS: PieceJustificativeDetail = {
    reference: 'PJ-2',
    libelle: 'Mandat',
    dateDepot: '2026-08-03',
    statut: 'EnCoursValidation',
    version: 0,
    historique: [{ date: '2026-08-04T09:00:00Z', statut: 'EnCoursValidation', auteur: 'Mme Rossi' }],
    actions: DISPONIBLES_EN_COURS,
  };

  const VALIDEE: PieceJustificativeDetail = {
    ...EN_COURS,
    statut: 'Validee',
    version: 1,
    historique: [
      ...EN_COURS.historique,
      { date: '2026-10-14T10:00:00Z', statut: 'Validee', auteur: 'Gestionnaire de démonstration' },
    ],
    actions: EN_COURS.actions.map((d) =>
      d.action === 'reouvrir'
        ? { action: d.action, disponible: true }
        : { action: d.action, disponible: false, raison: 'TRANSITION_INTERDITE' as const },
    ),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function creer(detail: PieceJustificativeDetail) {
    const fixture = TestBed.createComponent(DetailComponent);
    fixture.componentRef.setInput('reference', detail.reference);
    const modifiees: unknown[] = [];
    fixture.componentInstance.pieceModifiee.subscribe((p) => modifiees.push(p));
    fixture.detectChanges();
    httpMock.expectOne(`/api/pieces-justificatives/${detail.reference}`).flush(detail);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, modifiees };
  }

  function bouton(element: HTMLElement, libelle: string): HTMLButtonElement {
    const trouve = Array.from(element.querySelectorAll<HTMLButtonElement>('.actions-pj button')).find(
      (b) => b.textContent?.trim() === libelle,
    );
    if (!trouve) throw new Error(`Bouton ${libelle} introuvable`);
    return trouve;
  }

  function confirmer(fixture: ReturnType<typeof creer>['fixture'], element: HTMLElement) {
    element.querySelector('dialog form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  }

  it('affiche toujours les 5 actions ; une action indisponible porte aria-disabled et une explication reliée (CA6.1, CA1.3)', () => {
    const { element } = creer(VALIDEE);
    expect(element.querySelectorAll('.actions-pj button').length).toBe(5);
    const valider = bouton(element, 'Valider');
    expect(valider.getAttribute('aria-disabled')).toBe('true');
    expect(valider.disabled).toBe(false);
    const explication = element.querySelector(`#${valider.getAttribute('aria-describedby')}`);
    expect(explication!.textContent).toContain('la pièce est « Validée »');
    expect(bouton(element, 'Réouvrir').hasAttribute('aria-disabled')).toBe(false);
  });

  it('explique le défaut d’habilitation (CA6.2)', () => {
    const { element } = creer({
      ...EN_COURS,
      actions: EN_COURS.actions.map((d) => ({
        action: d.action,
        disponible: false,
        raison: 'HABILITATION_MANQUANTE' as const,
      })),
    });
    for (const libelle of ['Valider', 'Rejeter', 'Suspendre', 'Reprendre', 'Réouvrir']) {
      const b = bouton(element, libelle);
      expect(b.getAttribute('aria-disabled')).toBe('true');
      expect(element.querySelector(`#${b.getAttribute('aria-describedby')}`)!.textContent).toContain(
        'habilitation « Traitement des PJ » requise',
      );
    }
  });

  it('un clic sur une action indisponible n’ouvre aucune confirmation', () => {
    const { fixture, element } = creer(VALIDEE);
    bouton(element, 'Valider').click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')).toBeNull();
  });

  it('valider : confirmation, envoi de la version lue, statut et historique mis à jour, annonce, liste prévenue (CA1.1, CA1.2)', () => {
    const { fixture, element, modifiees } = creer(EN_COURS);
    bouton(element, 'Valider').click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')).not.toBeNull();

    confirmer(fixture, element);
    const requete = httpMock.expectOne('/api/pieces-justificatives/PJ-2/actions');
    expect(requete.request.body).toEqual({ action: 'valider', version: 0 });
    expect((element.querySelector('dialog button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    requete.flush(VALIDEE);
    fixture.detectChanges();

    expect(element.querySelector('dialog')).toBeNull();
    expect(element.textContent).toContain('Statut courant :');
    expect(element.querySelector('p .badge')!.textContent).toContain('Validée');
    expect(element.querySelectorAll('ul li').length).toBe(2);
    expect(element.querySelector('[role="status"]')!.textContent).toContain('Statut mis à jour : Validée');
    expect(modifiees).toEqual([
      { reference: 'PJ-2', libelle: 'Mandat', dateDepot: '2026-08-03', statut: 'Validee' },
    ]);
  });

  it('annuler la confirmation n’envoie rien (CA1.4)', () => {
    const { fixture, element } = creer(EN_COURS);
    bouton(element, 'Suspendre').click();
    fixture.detectChanges();
    (element.querySelector('dialog button[type="button"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')).toBeNull();
    httpMock.expectNone('/api/pieces-justificatives/PJ-2/actions');
  });

  it('erreur réseau : la boîte reste ouverte, motif conservé, statut inchangé', () => {
    const { fixture, element, modifiees } = creer(EN_COURS);
    bouton(element, 'Rejeter').click();
    fixture.detectChanges();
    const zone = element.querySelector('textarea')!;
    zone.value = 'Pièce illisible';
    zone.dispatchEvent(new Event('input'));
    confirmer(fixture, element);

    const requete = httpMock.expectOne('/api/pieces-justificatives/PJ-2/actions');
    expect(requete.request.body).toEqual({ action: 'rejeter', version: 0, motif: 'Pièce illisible' });
    requete.flush(null, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    expect(element.querySelector('dialog')).not.toBeNull();
    expect(element.querySelector('dialog [role="alert"]')!.textContent).toContain("n'a pas pu être enregistrée");
    expect(element.querySelector('textarea')!.value).toBe('Pièce illisible');
    expect(element.querySelector('p .badge')!.textContent).toContain('En cours de validation');
    expect(modifiees).toEqual([]);
  });

  it('409 PJ_MODIFIEE : message explicite, PJ à jour affichée et transmise à la liste (décision n° 8)', () => {
    const { fixture, element, modifiees } = creer(EN_COURS);
    bouton(element, 'Suspendre').click();
    fixture.detectChanges();
    confirmer(fixture, element);
    httpMock
      .expectOne('/api/pieces-justificatives/PJ-2/actions')
      .flush({ code: 'PJ_MODIFIEE', pieceActuelle: VALIDEE }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(element.querySelector('dialog')).toBeNull();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('modifiée entre-temps');
    expect(element.querySelector('p .badge')!.textContent).toContain('Validée');
    expect(modifiees.length).toBe(1);
  });
});
