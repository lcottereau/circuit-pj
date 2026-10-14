import { Router } from 'express';
import {
  listerPiecesJustificatives,
  remplacerPiece,
  trouverPieceJustificative,
  type PieceJustificativeDetail,
} from '../data/pieces-justificatives.js';
import {
  aHabilitationConsultationCircuitPJ,
  aHabilitationTraitementPJ,
  utilisateurCourant,
} from '../auth/current-user.stub.js';
import {
  appliquerAction,
  disponibilites,
  type DisponibiliteAction,
} from '../domain/traitement-pj.js';
import { analyserCommandeAction } from './commande-action.schema.js';

export const piecesJustificativesRouter = Router();

/** Détail exposé par l'API : la PJ, sa version et la disponibilité des actions (plan 003, D2). */
function versDetailApi(
  piece: PieceJustificativeDetail,
): PieceJustificativeDetail & { actions: DisponibiliteAction[] } {
  return { ...piece, actions: disponibilites(piece.statut, aHabilitationTraitementPJ()) };
}

piecesJustificativesRouter.get('/api/pieces-justificatives', (_req, res) => {
  if (!aHabilitationConsultationCircuitPJ()) {
    res.status(403).json({
      code: 'HABILITATION_MANQUANTE',
      message: "L'habilitation « Consultation des circuits de validation PJ » est requise.",
    });
    return;
  }
  res.status(200).json(listerPiecesJustificatives());
});

piecesJustificativesRouter.get('/api/pieces-justificatives/:reference', (req, res) => {
  if (!aHabilitationConsultationCircuitPJ()) {
    res.status(403).json({
      code: 'HABILITATION_MANQUANTE',
      message: "L'habilitation « Consultation des circuits de validation PJ » est requise.",
    });
    return;
  }

  const piece = trouverPieceJustificative(req.params.reference);
  if (!piece) {
    res.status(404).json({
      code: 'PJ_INCONNUE',
      message: `Aucune pièce justificative avec la référence « ${req.params.reference} ».`,
    });
    return;
  }
  res.status(200).json(versDetailApi(piece));
});

/**
 * Traitement d'une PJ (spec 003). Contrôles dans l'ordre du plan 003,
 * section 5. Lecture, contrôles et écriture sont synchrones : aucune autre
 * requête ne peut s'intercaler entre la vérification de version et
 * l'écriture (plan 003, D4).
 */
piecesJustificativesRouter.post('/api/pieces-justificatives/:reference/actions', (req, res) => {
  if (!aHabilitationConsultationCircuitPJ()) {
    res.status(403).json({
      code: 'HABILITATION_MANQUANTE',
      message: "L'habilitation « Consultation des circuits de validation PJ » est requise.",
    });
    return;
  }
  if (!aHabilitationTraitementPJ()) {
    res.status(403).json({
      code: 'HABILITATION_MANQUANTE',
      message: "L'habilitation « Traitement des PJ » est requise.",
    });
    return;
  }

  const analyse = analyserCommandeAction(req.body);
  if (!analyse.ok) {
    res.status(400).json({ code: analyse.code, message: analyse.message });
    return;
  }

  const piece = trouverPieceJustificative(req.params.reference);
  if (!piece) {
    res.status(404).json({
      code: 'PJ_INCONNUE',
      message: `Aucune pièce justificative avec la référence « ${req.params.reference} ».`,
    });
    return;
  }

  const resultat = appliquerAction(piece, analyse.commande, utilisateurCourant().nom, new Date());
  if (!resultat.ok) {
    switch (resultat.erreur) {
      case 'PJ_MODIFIEE':
        res.status(409).json({
          code: 'PJ_MODIFIEE',
          message: 'Cette pièce justificative a été modifiée entre-temps.',
          pieceActuelle: versDetailApi(piece),
        });
        return;
      case 'TRANSITION_INTERDITE':
        res.status(409).json({
          code: 'TRANSITION_INTERDITE',
          message: 'Cette action est impossible dans le statut actuel de la pièce justificative.',
        });
        return;
      default:
        // Motif déjà contrôlé à la frontière : ne survient qu'en cas d'incohérence interne.
        res.status(400).json({ code: resultat.erreur, message: 'Motif de rejet invalide.' });
        return;
    }
  }

  remplacerPiece(resultat.piece);
  res.status(200).json(versDetailApi(resultat.piece));
});
