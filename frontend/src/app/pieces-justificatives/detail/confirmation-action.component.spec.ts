import { TestBed } from '@angular/core/testing';
import { ConfirmationActionComponent } from './confirmation-action.component';
import type { ActionPJ } from '../piece-justificative-detail.schema';

describe('ConfirmationActionComponent', () => {
  function creer(action: ActionPJ) {
    const fixture = TestBed.createComponent(ConfirmationActionComponent);
    fixture.componentRef.setInput('action', action);
    fixture.componentRef.setInput('reference', 'PJ-1');
    const confirmations: (string | undefined)[] = [];
    let annulations = 0;
    fixture.componentInstance.confirmer.subscribe((m) => confirmations.push(m));
    fixture.componentInstance.annuler.subscribe(() => annulations++);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, confirmations, annulations: () => annulations };
  }

  function soumettre(element: HTMLElement) {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  function saisir(element: HTMLElement, texte: string) {
    const zone = element.querySelector('textarea')!;
    zone.value = texte;
    zone.dispatchEvent(new Event('input'));
  }

  it('ouvre une boîte nommant l’action et la pièce', () => {
    const { element } = creer('valider');
    expect(element.querySelector('dialog')!.hasAttribute('open')).toBe(true);
    expect(element.querySelector('h2')!.textContent).toContain('Valider la pièce PJ-1');
  });

  it('Annuler émet l’annulation sans confirmer (CA1.4, CA2.7)', () => {
    const { element, confirmations, annulations } = creer('valider');
    (element.querySelector('button[type="button"]') as HTMLButtonElement).click();
    expect(annulations()).toBe(1);
    expect(confirmations).toEqual([]);
  });

  it('Échap (événement cancel) annule sans confirmer', () => {
    const { element, confirmations, annulations } = creer('suspendre');
    element.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(annulations()).toBe(1);
    expect(confirmations).toEqual([]);
  });

  for (const action of ['valider', 'suspendre', 'reprendre', 'reouvrir'] as const) {
    it(`${action} : aucun champ de motif, confirmation sans motif (CA3.2)`, () => {
      const { element, confirmations } = creer(action);
      expect(element.querySelector('textarea')).toBeNull();
      soumettre(element);
      expect(confirmations).toEqual([undefined]);
    });
  }

  it('rejet sans motif : message relié au champ, pas de confirmation (CA2.2)', () => {
    const { fixture, element, confirmations } = creer('rejeter');
    saisir(element, '   \n ');
    soumettre(element);
    fixture.detectChanges();
    const zone = element.querySelector('textarea')!;
    expect(confirmations).toEqual([]);
    expect(zone.getAttribute('aria-invalid')).toBe('true');
    expect(zone.getAttribute('aria-describedby')).toContain('motif-erreur');
    expect(element.querySelector('#motif-erreur')!.textContent).toContain('obligatoire');
  });

  it('rejet avec 10 001 caractères : message de longueur, pas de confirmation (CA2.3)', () => {
    const { fixture, element, confirmations } = creer('rejeter');
    saisir(element, 'a'.repeat(10001));
    soumettre(element);
    fixture.detectChanges();
    expect(confirmations).toEqual([]);
    expect(element.querySelector('#motif-erreur')!.textContent).toContain('10');
    expect(element.querySelector('textarea')!.hasAttribute('maxlength')).toBe(false);
  });

  it('rejet avec motif valide : confirmation avec le motif tel que saisi', () => {
    const { element, confirmations } = creer('rejeter');
    saisir(element, ' Montant erroné\nligne 3 ');
    soumettre(element);
    expect(confirmations).toEqual([' Montant erroné\nligne 3 ']);
  });

  it('pendant l’envoi, les boutons sont désactivés et une nouvelle soumission est ignorée (double clic)', () => {
    const { fixture, element, confirmations } = creer('valider');
    fixture.componentRef.setInput('enCours', true);
    fixture.detectChanges();
    expect((element.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    soumettre(element);
    expect(confirmations).toEqual([]);
  });

  it('affiche l’erreur d’envoi en conservant le motif saisi (erreur réseau)', () => {
    const { fixture, element } = creer('rejeter');
    saisir(element, 'Motif long à ne pas perdre');
    fixture.componentRef.setInput('erreurEnvoi', "L'action n'a pas pu être enregistrée.");
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain("n'a pas pu être enregistrée");
    expect(element.querySelector('textarea')!.value).toBe('Motif long à ne pas perdre');
  });
});
