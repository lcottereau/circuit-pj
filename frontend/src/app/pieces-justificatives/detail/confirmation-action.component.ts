import {
  Component,
  type AfterViewInit,
  type ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { ActionPJ } from '../piece-justificative-detail.schema';
import { LIBELLE_ACTION } from '../libelle-action';
import {
  MESSAGE_ERREUR_MOTIF,
  MOTIF_REJET_LONGUEUR_MAX,
  longueurMotif,
  verifierMotifRejet,
  type ErreurMotif,
} from './motif-rejet';

/**
 * Boîte de confirmation modale native (plan 003, section 3) : `showModal()`
 * piège le focus et rend le reste de la page inerte ; Échap déclenche
 * l'annulation. Le parent la retire du DOM pour la fermer et rend le focus
 * au bouton déclencheur.
 */
@Component({
  selector: 'app-confirmation-action',
  standalone: true,
  templateUrl: './confirmation-action.component.html',
})
export class ConfirmationActionComponent implements AfterViewInit {
  readonly action = input.required<ActionPJ>();
  readonly reference = input.required<string>();
  /** Envoi en cours : le bouton de confirmation est désactivé (double clic). */
  readonly enCours = input(false);
  /** Message d'échec d'envoi à afficher dans la boîte, qui reste ouverte. */
  readonly erreurEnvoi = input<string | null>(null);

  readonly confirmer = output<string | undefined>();
  readonly annuler = output<void>();

  protected readonly libelleAction = LIBELLE_ACTION;
  protected readonly longueurMax = MOTIF_REJET_LONGUEUR_MAX.toLocaleString('fr-FR');
  protected readonly messageErreurMotif = MESSAGE_ERREUR_MOTIF;

  protected readonly motif = signal('');
  protected readonly erreurMotif = signal<ErreurMotif | null>(null);
  protected readonly longueurSaisie = computed(() => longueurMotif(this.motif()));

  private readonly dialogue = viewChild.required<ElementRef<HTMLDialogElement>>('dialogue');

  ngAfterViewInit(): void {
    const dialogue = this.dialogue().nativeElement;
    if (typeof dialogue.showModal === 'function') {
      dialogue.showModal();
    } else {
      dialogue.setAttribute('open', '');
    }
  }

  protected saisirMotif(evenement: Event): void {
    this.motif.set((evenement.target as HTMLTextAreaElement).value);
    if (this.erreurMotif() !== null) this.erreurMotif.set(verifierMotifRejet(this.motif()));
  }

  /** Échap : on garde la main sur la fermeture pour rendre le focus proprement. */
  protected surAnnulationNative(evenement: Event): void {
    evenement.preventDefault();
    if (!this.enCours()) this.annuler.emit();
  }

  protected valider(evenement: Event): void {
    evenement.preventDefault();
    if (this.enCours()) return;
    if (this.action() !== 'rejeter') {
      this.confirmer.emit(undefined);
      return;
    }
    const erreur = verifierMotifRejet(this.motif());
    this.erreurMotif.set(erreur);
    if (erreur === null) this.confirmer.emit(this.motif());
  }
}
