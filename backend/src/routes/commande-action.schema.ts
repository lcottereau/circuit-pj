import { z } from 'zod';
import {
  MOTIF_REJET_LONGUEUR_MAX,
  verifierMotifRejet,
  type CommandeAction,
} from '../domain/traitement-pj.js';

/**
 * Validation du corps de `POST /api/pieces-justificatives/:reference/actions`
 * (constitution, article VI ; plan 003, D3). Objets stricts : tout champ
 * inconnu — notamment `auteur` ou `date` — est refusé, l'auteur et la date
 * étant toujours fixés par le serveur (spec 003, section 6).
 */
const version = z.number().int().nonnegative();

const CommandeActionSchema = z.discriminatedUnion('action', [
  // Motif optionnel ici pour qu'un motif absent soit signalé MOTIF_OBLIGATOIRE plutôt que REQUETE_INVALIDE.
  z.strictObject({ action: z.literal('rejeter'), version, motif: z.string().optional() }),
  z.strictObject({ action: z.enum(['valider', 'suspendre', 'reprendre', 'reouvrir']), version }),
]);

export type CodeErreurCommande = 'REQUETE_INVALIDE' | 'MOTIF_OBLIGATOIRE' | 'MOTIF_TROP_LONG';

export type AnalyseCommande =
  | { ok: true; commande: CommandeAction }
  | { ok: false; code: CodeErreurCommande; message: string };

const MESSAGES: Record<CodeErreurCommande, string> = {
  REQUETE_INVALIDE: 'La demande de traitement est invalide.',
  MOTIF_OBLIGATOIRE: 'Le motif de rejet est obligatoire.',
  MOTIF_TROP_LONG: `Le motif de rejet ne doit pas dépasser ${MOTIF_REJET_LONGUEUR_MAX} caractères.`,
};

function echec(code: CodeErreurCommande): AnalyseCommande {
  return { ok: false, code, message: MESSAGES[code] };
}

export function analyserCommandeAction(corps: unknown): AnalyseCommande {
  const resultat = CommandeActionSchema.safeParse(corps);
  if (!resultat.success) return echec('REQUETE_INVALIDE');

  const donnees = resultat.data;
  if (donnees.action !== 'rejeter') return { ok: true, commande: donnees };

  const motif = donnees.motif ?? '';
  const erreurMotif = verifierMotifRejet(motif);
  if (erreurMotif !== null) return echec(erreurMotif);
  return { ok: true, commande: { action: 'rejeter', version: donnees.version, motif } };
}
