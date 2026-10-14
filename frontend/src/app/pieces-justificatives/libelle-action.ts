import { LIBELLE_STATUT, type StatutPJ } from './pieces-justificative.schema';
import type { ActionPJ, DisponibiliteAction } from './piece-justificative-detail.schema';

/** Libellés des actions de traitement (spec 003, section 4). */
export const LIBELLE_ACTION: Record<ActionPJ, string> = {
  valider: 'Valider',
  rejeter: 'Rejeter',
  suspendre: 'Suspendre',
  reprendre: 'Reprendre',
  reouvrir: 'Réouvrir',
};

/**
 * Explication affichée à côté d'une action indisponible (constitution,
 * article IV ; plan 003, D5). La disponibilité elle-même est décidée par le
 * serveur : cette fonction ne fait que la mettre en mots.
 */
export function explicationIndisponibilite(
  disponibilite: DisponibiliteAction,
  statut: StatutPJ,
): string {
  if (disponibilite.raison === 'HABILITATION_MANQUANTE') {
    return 'Indisponible : habilitation « Traitement des PJ » requise.';
  }
  return `Indisponible : la pièce est « ${LIBELLE_STATUT[statut]} ».`;
}
