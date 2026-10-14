import { Component, computed, inject, signal } from '@angular/core';
import {
  LIBELLE_STATUT,
  type PieceJustificative,
  type StatutPJ,
} from '../pieces-justificative.schema';
import { PiecesJustificativesService, type ErreurApi } from '../pieces-justificatives.service';
import { normaliserTexte } from '../normaliser-texte';
import { categorieStatut } from '../categorie-statut';
import { FiltreStatutComponent } from './filtre-statut.component';
import { RechercheComponent } from './recherche.component';
import { DetailComponent } from '../detail/detail.component';

type SensTri = 'croissant' | 'decroissant';

@Component({
  selector: 'app-liste-pieces-justificatives',
  standalone: true,
  imports: [FiltreStatutComponent, RechercheComponent, DetailComponent],
  templateUrl: './liste.component.html',
})
export class ListeComponent {
  private readonly service = inject(PiecesJustificativesService);

  readonly libelleStatut = LIBELLE_STATUT;
  readonly categorieStatut = categorieStatut;

  protected readonly piecesBrutes = signal<PieceJustificative[] | null>(null);
  protected readonly erreur = signal<ErreurApi | null>(null);
  protected readonly statutsFiltres = signal<ReadonlySet<StatutPJ>>(new Set());
  protected readonly texteRecherche = signal('');
  protected readonly sensTri = signal<SensTri>('decroissant');
  protected readonly referenceOuverte = signal<string | null>(null);

  protected readonly piecesAffichees = computed(() => {
    const pieces = this.piecesBrutes();
    if (pieces === null) return [];

    const statuts = this.statutsFiltres();
    const recherche = normaliserTexte(this.texteRecherche());

    const filtrees = pieces.filter((piece) => {
      const passeStatut = statuts.size === 0 || statuts.has(piece.statut);
      const passeRecherche =
        recherche === '' ||
        normaliserTexte(piece.reference).includes(recherche) ||
        normaliserTexte(piece.libelle).includes(recherche);
      return passeStatut && passeRecherche;
    });

    const sens = this.sensTri() === 'croissant' ? 1 : -1;
    return [...filtrees].sort((a, b) => {
      if (a.dateDepot === null && b.dateDepot === null) return 0;
      if (a.dateDepot === null) return 1;
      if (b.dateDepot === null) return -1;
      return sens * a.dateDepot.localeCompare(b.dateDepot);
    });
  });

  constructor() {
    this.chargerListe();
  }

  private chargerListe(): void {
    this.piecesBrutes.set(null);
    this.erreur.set(null);
    this.service.listerPiecesJustificatives().subscribe({
      next: (pieces) => this.piecesBrutes.set(pieces),
      error: (erreur: ErreurApi) => this.erreur.set(erreur),
    });
  }

  reessayer(): void {
    this.chargerListe();
  }

  changerStatutsFiltres(statuts: ReadonlySet<StatutPJ>): void {
    this.statutsFiltres.set(statuts);
  }

  changerTexteRecherche(texte: string): void {
    this.texteRecherche.set(texte);
  }

  basculerSensTri(): void {
    this.sensTri.set(this.sensTri() === 'croissant' ? 'decroissant' : 'croissant');
  }

  ouvrirDetail(reference: string): void {
    this.referenceOuverte.set(reference);
  }

  /** Remplace la ligne modifiée sans recharger : filtre, tri et recherche sont conservés. */
  mettreAJourPiece(miseAJour: PieceJustificative): void {
    const pieces = this.piecesBrutes();
    if (pieces === null) return;
    this.piecesBrutes.set(
      pieces.map((piece) => (piece.reference === miseAJour.reference ? miseAJour : piece)),
    );
  }

  fermerDetail(): void {
    this.referenceOuverte.set(null);
  }
}
