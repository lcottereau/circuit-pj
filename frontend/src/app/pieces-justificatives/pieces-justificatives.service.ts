import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PiecesJustificativesSchema, type PieceJustificative } from './pieces-justificative.schema';
import {
  PieceJustificativeDetailSchema,
  type ActionPJ,
  type PieceJustificativeDetail,
} from './piece-justificative-detail.schema';

export type ErreurApi =
  | { type: 'habilitation' }
  | { type: 'introuvable' }
  | { type: 'reseau' }
  /** 409 PJ_MODIFIEE : la PJ a changé depuis son affichage (spec 003, décision n° 8). */
  | { type: 'conflit'; pieceActuelle: PieceJustificativeDetail }
  /** 409 TRANSITION_INTERDITE : action impossible dans le statut courant. */
  | { type: 'transition' }
  /** 400 (ou 413 si le corps dépasse la limite du serveur) : demande refusée à la validation. */
  | { type: 'validation'; code: string };

/** Commande envoyée au serveur ; l'auteur et la date sont toujours fixés côté serveur. */
export type CommandeAction =
  | { action: 'rejeter'; version: number; motif: string }
  | { action: Exclude<ActionPJ, 'rejeter'>; version: number };

function codeErreur(erreur: HttpErrorResponse): string | undefined {
  const corps: unknown = erreur.error;
  if (typeof corps === 'object' && corps !== null && 'code' in corps && typeof corps.code === 'string') {
    return corps.code;
  }
  return undefined;
}

function versErreurApi(erreur: HttpErrorResponse): ErreurApi {
  if (erreur.status === 403) return { type: 'habilitation' };
  if (erreur.status === 404) return { type: 'introuvable' };
  if (erreur.status === 400) return { type: 'validation', code: codeErreur(erreur) ?? 'REQUETE_INVALIDE' };
  if (erreur.status === 413) return { type: 'validation', code: 'MOTIF_TROP_LONG' };
  if (erreur.status === 409) {
    if (codeErreur(erreur) === 'PJ_MODIFIEE') {
      const corps = erreur.error as { pieceActuelle?: unknown };
      const piece = PieceJustificativeDetailSchema.safeParse(corps.pieceActuelle);
      if (piece.success) return { type: 'conflit', pieceActuelle: piece.data };
      return { type: 'reseau' };
    }
    return { type: 'transition' };
  }
  return { type: 'reseau' };
}

@Injectable({ providedIn: 'root' })
export class PiecesJustificativesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/pieces-justificatives';

  listerPiecesJustificatives(): Observable<PieceJustificative[]> {
    return this.http.get<unknown>(this.baseUrl).pipe(
      map((donnees) => PiecesJustificativesSchema.parse(donnees)),
      catchError((erreur: HttpErrorResponse) => throwError(() => versErreurApi(erreur))),
    );
  }

  obtenirDetail(reference: string): Observable<PieceJustificativeDetail> {
    return this.http.get<unknown>(`${this.baseUrl}/${encodeURIComponent(reference)}`).pipe(
      map((donnees) => PieceJustificativeDetailSchema.parse(donnees)),
      catchError((erreur: HttpErrorResponse) => throwError(() => versErreurApi(erreur))),
    );
  }

  executerAction(reference: string, commande: CommandeAction): Observable<PieceJustificativeDetail> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${encodeURIComponent(reference)}/actions`, commande)
      .pipe(
        map((donnees) => PieceJustificativeDetailSchema.parse(donnees)),
        catchError((erreur: HttpErrorResponse) => throwError(() => versErreurApi(erreur))),
      );
  }
}
