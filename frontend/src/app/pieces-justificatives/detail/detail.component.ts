import {
  Component,
  Injector,
  OnInit,
  afterNextRender,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LIBELLE_STATUT, type PieceJustificative } from '../pieces-justificative.schema';
import { categorieStatut } from '../categorie-statut';
import type {
  ActionPJ,
  DisponibiliteAction,
  PieceJustificativeDetail,
} from '../piece-justificative-detail.schema';
import { LIBELLE_ACTION, explicationIndisponibilite } from '../libelle-action';
import { ConfirmationActionComponent } from './confirmation-action.component';
import {
  PiecesJustificativesService,
  type CommandeAction,
  type ErreurApi,
} from '../pieces-justificatives.service';

@Component({
  selector: 'app-detail-piece-justificative',
  standalone: true,
  imports: [ConfirmationActionComponent],
  templateUrl: './detail.component.html',
})
export class DetailComponent implements OnInit {
  private readonly service = inject(PiecesJustificativesService);
  private readonly injector = inject(Injector);

  readonly reference = input.required<string>();
  readonly fermer = output<void>();
  /** Résumé à jour après un changement de statut, pour la liste (plan 003, D7). */
  readonly pieceModifiee = output<PieceJustificative>();

  readonly libelleStatut = LIBELLE_STATUT;
  readonly categorieStatut = categorieStatut;
  readonly libelleAction = LIBELLE_ACTION;
  readonly explicationIndisponibilite = explicationIndisponibilite;

  protected readonly detail = signal<PieceJustificativeDetail | null>(null);
  protected readonly erreur = signal<ErreurApi | null>(null);
  /** Action en attente de confirmation et bouton qui l'a déclenchée (retour du focus). */
  protected readonly actionDemandee = signal<{ action: ActionPJ; declencheur: HTMLElement } | null>(
    null,
  );
  protected readonly enCours = signal(false);
  /** Échec d'envoi affiché dans la boîte, qui reste ouverte (motif conservé). */
  protected readonly erreurEnvoi = signal<string | null>(null);
  /** Message d'erreur affiché dans le détail après fermeture de la boîte. */
  protected readonly messageAction = signal<string | null>(null);
  /** Annonce du changement de statut aux technologies d'assistance (role="status"). */
  protected readonly annonce = signal('');

  ngOnInit(): void {
    this.service.obtenirDetail(this.reference()).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (erreur: ErreurApi) => this.erreur.set(erreur),
    });
  }

  /** Une action indisponible (aria-disabled) reste focalisable mais ne déclenche rien (plan 003, D5). */
  demanderAction(disponibilite: DisponibiliteAction, declencheur: HTMLElement): void {
    if (!disponibilite.disponible) return;
    this.messageAction.set(null);
    this.erreurEnvoi.set(null);
    this.annonce.set('');
    this.actionDemandee.set({ action: disponibilite.action, declencheur });
  }

  confirmerAction(motif: string | undefined): void {
    const demande = this.actionDemandee();
    const detail = this.detail();
    if (demande === null || detail === null || this.enCours()) return;

    const commande: CommandeAction =
      demande.action === 'rejeter'
        ? { action: 'rejeter', version: detail.version, motif: motif ?? '' }
        : { action: demande.action, version: detail.version };

    this.enCours.set(true);
    this.erreurEnvoi.set(null);
    this.service.executerAction(detail.reference, commande).subscribe({
      next: (miseAJour) => {
        this.enCours.set(false);
        this.afficherMiseAJour(miseAJour);
        this.annonce.set(`Statut mis à jour : ${this.libelleStatut[miseAJour.statut]}.`);
        this.fermerConfirmation();
      },
      error: (erreur: ErreurApi) => {
        this.enCours.set(false);
        this.traiterErreurAction(erreur);
      },
    });
  }

  private afficherMiseAJour(miseAJour: PieceJustificativeDetail): void {
    this.detail.set(miseAJour);
    const { reference, libelle, dateDepot, statut } = miseAJour;
    this.pieceModifiee.emit({ reference, libelle, dateDepot, statut });
  }

  private traiterErreurAction(erreur: ErreurApi): void {
    switch (erreur.type) {
      case 'reseau':
        this.erreurEnvoi.set(
          "L'action n'a pas pu être enregistrée (erreur réseau ou serveur). Le statut de la pièce n'a pas changé ; vous pouvez réessayer.",
        );
        return;
      case 'validation':
        this.erreurEnvoi.set(
          erreur.code === 'MOTIF_OBLIGATOIRE'
            ? 'Le motif du rejet est obligatoire.'
            : erreur.code === 'MOTIF_TROP_LONG'
              ? 'Le motif du rejet dépasse la longueur maximale autorisée.'
              : "La demande a été refusée par le serveur. Le statut de la pièce n'a pas changé.",
        );
        return;
      case 'conflit':
        this.afficherMiseAJour(erreur.pieceActuelle);
        this.messageAction.set(
          "Cette pièce a été modifiée entre-temps : votre action n'a pas été enregistrée. Le statut et l'historique à jour sont affichés.",
        );
        break;
      case 'transition':
        this.messageAction.set(
          "Cette action est impossible dans le statut actuel de la pièce : elle n'a pas été enregistrée.",
        );
        break;
      case 'habilitation':
        this.messageAction.set(
          "Action refusée : l'habilitation « Traitement des PJ » est requise. Rien n'a été enregistré.",
        );
        break;
      case 'introuvable':
        this.messageAction.set("Cette pièce justificative n'existe plus. Rien n'a été enregistré.");
        break;
    }
    this.fermerConfirmation();
  }

  /** Ferme la boîte et rend le focus au bouton déclencheur, une fois la boîte retirée du DOM. */
  fermerConfirmation(): void {
    const demande = this.actionDemandee();
    this.actionDemandee.set(null);
    if (demande !== null) {
      afterNextRender(() => demande.declencheur.focus(), { injector: this.injector });
    }
  }
}
