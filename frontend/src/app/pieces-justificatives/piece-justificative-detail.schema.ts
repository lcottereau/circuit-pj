import { z } from 'zod';
import { PieceJustificativeSchema, StatutPJSchema } from './pieces-justificative.schema';

export const HistoriqueEntreeSchema = z.object({
  date: z.string(),
  statut: StatutPJSchema,
  auteur: z.string(),
  motif: z.string().optional(),
});
export type HistoriqueEntree = z.infer<typeof HistoriqueEntreeSchema>;

export const ActionPJSchema = z.enum(['valider', 'rejeter', 'suspendre', 'reprendre', 'reouvrir']);
export type ActionPJ = z.infer<typeof ActionPJSchema>;

/** Disponibilité d'une action, calculée par le serveur (plan 003, décision D2). */
export const DisponibiliteActionSchema = z.object({
  action: ActionPJSchema,
  disponible: z.boolean(),
  raison: z.enum(['TRANSITION_INTERDITE', 'HABILITATION_MANQUANTE']).optional(),
});
export type DisponibiliteAction = z.infer<typeof DisponibiliteActionSchema>;

export const PieceJustificativeDetailSchema = PieceJustificativeSchema.extend({
  historique: z.array(HistoriqueEntreeSchema),
  version: z.number().int().nonnegative(),
  actions: z.array(DisponibiliteActionSchema).length(5),
});
export type PieceJustificativeDetail = z.infer<typeof PieceJustificativeDetailSchema>;
