/**
 * Contrôle du motif de rejet côté interface, pour l'aide à la saisie
 * (CA2.2, CA2.3). Le serveur reste l'autorité : ces valeurs reprennent
 * celles de `backend/src/domain/traitement-pj.ts` (spec 003, décision n° 14).
 */
export const MOTIF_REJET_LONGUEUR_MAX = 10000;

export type ErreurMotif = 'MOTIF_OBLIGATOIRE' | 'MOTIF_TROP_LONG';

/** Longueur en caractères (points de code), comme côté serveur. */
export function longueurMotif(motif: string): number {
  return [...motif].length;
}

export function verifierMotifRejet(motif: string): ErreurMotif | null {
  if (motif.trim() === '') return 'MOTIF_OBLIGATOIRE';
  if (longueurMotif(motif) > MOTIF_REJET_LONGUEUR_MAX) return 'MOTIF_TROP_LONG';
  return null;
}

export const MESSAGE_ERREUR_MOTIF: Record<ErreurMotif, string> = {
  MOTIF_OBLIGATOIRE: 'Le motif du rejet est obligatoire.',
  MOTIF_TROP_LONG: `Le motif du rejet ne doit pas dépasser ${MOTIF_REJET_LONGUEUR_MAX.toLocaleString('fr-FR')} caractères.`,
};
