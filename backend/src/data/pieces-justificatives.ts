import { isDeepStrictEqual } from 'node:util';

export type StatutPJ = 'NonValidee' | 'EnCoursValidation' | 'Validee' | 'Refusee' | 'Suspendue';

export interface HistoriqueEntree {
  date: string;
  statut: StatutPJ;
  auteur: string;
  motif?: string;
}

export interface PieceJustificative {
  reference: string;
  libelle: string;
  dateDepot: string | null;
  statut: StatutPJ;
}

export interface PieceJustificativeDetail extends PieceJustificative {
  historique: HistoriqueEntree[];
  /** Incrémentée à chaque action réussie (plan 003, décision D4). */
  version: number;
}

/**
 * Graine du magasin en mémoire (plan 001, décision D2 ; plan 003, décision
 * D6). Couvre volontairement : les 5 statuts, une PJ sans date de dépôt
 * (PJ-2026-0003), une PJ sans historique (PJ-2026-0003), une entrée
 * d'historique avec motif et une sans.
 */
const GRAINE: readonly PieceJustificativeDetail[] = [
  {
    reference: 'PJ-2026-0001',
    libelle: 'Facture fourniture de bureau — Papeterie Centrale',
    dateDepot: '2026-08-01',
    statut: 'Validee',
    version: 0,
    historique: [
      { date: '2026-08-01T09:12:00Z', statut: 'NonValidee', auteur: 'M. Dupont' },
      { date: '2026-08-02T10:00:00Z', statut: 'EnCoursValidation', auteur: 'Mme Rossi' },
      { date: '2026-08-05T14:30:00Z', statut: 'Validee', auteur: 'M. Lefevre' },
    ],
  },
  {
    reference: 'PJ-2026-0002',
    libelle: 'Mandat de paiement — Entretien des espaces verts',
    dateDepot: '2026-08-03',
    statut: 'EnCoursValidation',
    version: 0,
    historique: [
      { date: '2026-08-03T08:00:00Z', statut: 'NonValidee', auteur: 'M. Dupont' },
      { date: '2026-08-04T09:00:00Z', statut: 'EnCoursValidation', auteur: 'Mme Rossi' },
    ],
  },
  {
    reference: 'PJ-2026-0003',
    libelle: 'Facture énergie — Éclairage public',
    dateDepot: null,
    statut: 'NonValidee',
    version: 0,
    historique: [],
  },
  {
    reference: 'PJ-2026-0004',
    libelle: 'Facture prestation — Nettoyage des locaux municipaux',
    dateDepot: '2026-07-20',
    statut: 'Refusee',
    version: 0,
    historique: [
      { date: '2026-07-20T09:00:00Z', statut: 'NonValidee', auteur: 'M. Dupont' },
      { date: '2026-07-22T11:00:00Z', statut: 'EnCoursValidation', auteur: 'Mme Rossi' },
      {
        date: '2026-07-25T16:45:00Z',
        statut: 'Refusee',
        auteur: 'M. Lefevre',
        motif: 'Pièce jointe manquante',
      },
    ],
  },
  {
    reference: 'PJ-2026-0005',
    libelle: 'Mandat de paiement — Fournitures scolaires',
    dateDepot: '2026-08-10',
    statut: 'Suspendue',
    version: 0,
    historique: [
      { date: '2026-08-10T08:30:00Z', statut: 'NonValidee', auteur: 'M. Dupont' },
      { date: '2026-08-11T09:15:00Z', statut: 'EnCoursValidation', auteur: 'Mme Rossi' },
      {
        date: '2026-08-12T13:00:00Z',
        statut: 'Suspendue',
        auteur: 'M. Lefevre',
        motif: 'En attente de pièce complémentaire',
      },
    ],
  },
];

/**
 * Magasin en mémoire : copie profonde de la graine, perdue au redémarrage
 * (spec 003, décision n° 11). Les lectures renvoient des copies, et la seule
 * écriture possible est `remplacerPiece`, qui n'accepte qu'un ajout d'entrée
 * d'historique (constitution, article III).
 */
let magasin: PieceJustificativeDetail[] = structuredClone(GRAINE) as PieceJustificativeDetail[];

/** Remet le magasin dans l'état de la graine (isolation des tests). */
export function reinitialiserPiecesJustificatives(): void {
  magasin = structuredClone(GRAINE) as PieceJustificativeDetail[];
}

export function listerPiecesJustificatives(): PieceJustificative[] {
  return magasin.map(({ reference, libelle, dateDepot, statut }) => ({
    reference,
    libelle,
    dateDepot,
    statut,
  }));
}

export function trouverPieceJustificative(reference: string): PieceJustificativeDetail | undefined {
  const piece = magasin.find((p) => p.reference === reference);
  return piece === undefined ? undefined : structuredClone(piece);
}

/**
 * Remplace une PJ par sa version suivante. Refuse (erreur de programmation)
 * toute nouvelle version qui ne serait pas l'ancienne augmentée d'exactement
 * une entrée d'historique, entrées antérieures strictement inchangées, et
 * d'un numéro de version incrémenté de 1.
 */
export function remplacerPiece(nouvelle: PieceJustificativeDetail): void {
  const index = magasin.findIndex((p) => p.reference === nouvelle.reference);
  if (index === -1) {
    throw new Error(`PJ inconnue : ${nouvelle.reference}`);
  }
  const actuelle = magasin[index]!;
  const ajoutSeul =
    nouvelle.version === actuelle.version + 1 &&
    nouvelle.historique.length === actuelle.historique.length + 1 &&
    isDeepStrictEqual(nouvelle.historique.slice(0, -1), actuelle.historique);
  if (!ajoutSeul) {
    throw new Error(`Modification de l'historique refusée pour ${nouvelle.reference}`);
  }
  magasin[index] = structuredClone(nouvelle);
}
