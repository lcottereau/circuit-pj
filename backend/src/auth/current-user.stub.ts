/**
 * STUB TEMPORAIRE — à remplacer par une authentification réelle.
 *
 * Aucune fonctionnalité d'authentification n'a été spécifiée à ce jour
 * (plan 001, décision D3). Ce fichier simule un unique utilisateur courant
 * pour permettre de vérifier réellement les contrôles d'habilitation
 * « Consultation des circuits de validation PJ » (001, CA1.6) et
 * « Traitement des PJ » (003, CA6.2) sans construire un système de
 * connexion. L'auteur inscrit dans l'historique lors d'un traitement est
 * donc lui aussi simulé (spec 003, décision n° 10 : risque accepté).
 * Ne pas utiliser au-delà d'un usage pédagogique/démonstratif.
 */

export const HABILITATION_CONSULTATION_CIRCUIT_PJ = 'CONSULTATION_CIRCUIT_PJ';
export const HABILITATION_TRAITEMENT_PJ = 'TRAITEMENT_PJ';

export interface UtilisateurCourant {
  nom: string;
  habilitations: string[];
}

/**
 * Configurable via des variables d'environnement pour simuler, en
 * démonstration ou en test :
 * - STUB_SANS_HABILITATION=true : aucune habilitation ;
 * - STUB_SANS_HABILITATION_TRAITEMENT=true : consultation seule.
 */
export function utilisateurCourant(): UtilisateurCourant {
  const sansHabilitation = process.env.STUB_SANS_HABILITATION === 'true';
  const sansTraitement = process.env.STUB_SANS_HABILITATION_TRAITEMENT === 'true';
  const habilitations: string[] = [];
  if (!sansHabilitation) {
    habilitations.push(HABILITATION_CONSULTATION_CIRCUIT_PJ);
    if (!sansTraitement) habilitations.push(HABILITATION_TRAITEMENT_PJ);
  }
  return { nom: 'Gestionnaire de démonstration', habilitations };
}

export function aHabilitationConsultationCircuitPJ(): boolean {
  return utilisateurCourant().habilitations.includes(HABILITATION_CONSULTATION_CIRCUIT_PJ);
}

export function aHabilitationTraitementPJ(): boolean {
  return utilisateurCourant().habilitations.includes(HABILITATION_TRAITEMENT_PJ);
}
