import type {
  HistoriqueEntree,
  PieceJustificativeDetail,
  StatutPJ,
} from '../data/pieces-justificatives.js';

/**
 * Règles métier du traitement d'une PJ (spec 003). Module pur : aucune
 * dépendance à HTTP, au magasin ni à l'horloge.
 */

export const ACTIONS_PJ = ['valider', 'rejeter', 'suspendre', 'reprendre', 'reouvrir'] as const;
export type ActionPJ = (typeof ACTIONS_PJ)[number];

/** Matrice de transition — spec 003, section 4 bis (décisions n° 2 et n° 3). */
const ACTIONS_AUTORISEES: Record<StatutPJ, ReadonlySet<ActionPJ>> = {
  NonValidee: new Set(['valider', 'rejeter', 'suspendre']),
  EnCoursValidation: new Set(['valider', 'rejeter', 'suspendre']),
  Validee: new Set(['reouvrir']),
  Refusee: new Set(['reouvrir']),
  Suspendue: new Set(['valider', 'rejeter', 'reprendre']),
};

const STATUT_ATTEINT: Record<ActionPJ, StatutPJ> = {
  valider: 'Validee',
  rejeter: 'Refusee',
  suspendre: 'Suspendue',
  // Décision n° 12 : toujours « En cours de validation », quel que soit le statut antérieur.
  reprendre: 'EnCoursValidation',
  reouvrir: 'EnCoursValidation',
};

/** Textes exacts de la décision n° 13. Valider n'a pas de motif ; rejeter a un motif saisi. */
const MOTIF_AUTOMATIQUE: Record<ActionPJ, string | undefined> = {
  valider: undefined,
  rejeter: undefined,
  suspendre: "Suspension demandée depuis l'écran de suivi",
  reprendre: "Reprise demandée depuis l'écran de suivi",
  reouvrir: "Réouverture demandée depuis l'écran de suivi",
};

export function actionAutorisee(statut: StatutPJ, action: ActionPJ): boolean {
  return ACTIONS_AUTORISEES[statut].has(action);
}

export function statutAtteint(action: ActionPJ): StatutPJ {
  return STATUT_ATTEINT[action];
}

export function motifAutomatique(action: ActionPJ): string | undefined {
  return MOTIF_AUTOMATIQUE[action];
}

export type RaisonIndisponibilite = 'TRANSITION_INTERDITE' | 'HABILITATION_MANQUANTE';

export interface DisponibiliteAction {
  action: ActionPJ;
  disponible: boolean;
  raison?: RaisonIndisponibilite;
}

/**
 * Disponibilité des 5 actions pour une PJ (plan 003, décision D2). Le défaut
 * d'habilitation l'emporte sur l'interdiction de transition (CA6.2).
 */
export function disponibilites(statut: StatutPJ, habilite: boolean): DisponibiliteAction[] {
  return ACTIONS_PJ.map((action) => {
    if (!habilite) return { action, disponible: false, raison: 'HABILITATION_MANQUANTE' };
    if (!actionAutorisee(statut, action)) {
      return { action, disponible: false, raison: 'TRANSITION_INTERDITE' };
    }
    return { action, disponible: true };
  });
}

/**
 * Seuil garanti et plafond technique du motif de rejet, en caractères (points
 * de code Unicode) — spec 003, décision n° 14. Dupliqué côté frontend pour
 * l'aide à la saisie ; cette valeur-ci fait foi.
 */
export const MOTIF_REJET_LONGUEUR_MAX = 10000;

export type ErreurMotif = 'MOTIF_OBLIGATOIRE' | 'MOTIF_TROP_LONG';

/** Compte en points de code, pour que 10 000 caractères hors BMP restent acceptés. */
export function longueurMotif(motif: string): number {
  return [...motif].length;
}

/**
 * Contrôle un motif de rejet (CA2.2, CA2.3). Renvoie l'erreur, ou `null` si le
 * motif est acceptable. Le motif accepté est conservé tel que saisi.
 */
export function verifierMotifRejet(motif: string): ErreurMotif | null {
  if (motif.trim() === '') return 'MOTIF_OBLIGATOIRE';
  if (longueurMotif(motif) > MOTIF_REJET_LONGUEUR_MAX) return 'MOTIF_TROP_LONG';
  return null;
}

/** Commande d'action telle qu'elle entre dans le domaine (après validation à la frontière). */
export type CommandeAction =
  | { action: 'rejeter'; version: number; motif: string }
  | { action: Exclude<ActionPJ, 'rejeter'>; version: number };

export type ErreurAction = 'PJ_MODIFIEE' | 'TRANSITION_INTERDITE' | ErreurMotif;

export type ResultatAction =
  | { ok: true; piece: PieceJustificativeDetail }
  | { ok: false; erreur: ErreurAction };

/**
 * Applique une action à une PJ et renvoie sa version suivante, sans modifier
 * la PJ reçue. Contrôles, dans l'ordre : version (plan 003, D4), matrice de
 * transition, motif de rejet. L'historique résultant est l'ancien augmenté
 * d'exactement une entrée (constitution, article III).
 */
export function appliquerAction(
  piece: PieceJustificativeDetail,
  commande: CommandeAction,
  auteur: string,
  maintenant: Date,
): ResultatAction {
  if (commande.version !== piece.version) return { ok: false, erreur: 'PJ_MODIFIEE' };
  if (!actionAutorisee(piece.statut, commande.action)) {
    return { ok: false, erreur: 'TRANSITION_INTERDITE' };
  }

  let motif: string | undefined;
  if (commande.action === 'rejeter') {
    const erreurMotif = verifierMotifRejet(commande.motif);
    if (erreurMotif !== null) return { ok: false, erreur: erreurMotif };
    motif = commande.motif;
  } else {
    motif = motifAutomatique(commande.action);
  }

  const statut = statutAtteint(commande.action);
  const entree: HistoriqueEntree = {
    date: maintenant.toISOString(),
    statut,
    auteur,
    ...(motif === undefined ? {} : { motif }),
  };

  return {
    ok: true,
    piece: {
      ...piece,
      statut,
      version: piece.version + 1,
      historique: [...piece.historique.map((e) => ({ ...e })), entree],
    },
  };
}
