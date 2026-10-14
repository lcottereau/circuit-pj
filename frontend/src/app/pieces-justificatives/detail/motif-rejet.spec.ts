import { MOTIF_REJET_LONGUEUR_MAX, verifierMotifRejet } from './motif-rejet';

describe('verifierMotifRejet', () => {
  it('refuse un motif vide ou blanc (CA2.2)', () => {
    expect(verifierMotifRejet('')).toBe('MOTIF_OBLIGATOIRE');
    expect(verifierMotifRejet('  \n\t ')).toBe('MOTIF_OBLIGATOIRE');
  });

  it('accepte 10 000 caractères, y compris hors BMP, et refuse au-delà (CA2.3)', () => {
    expect(MOTIF_REJET_LONGUEUR_MAX).toBe(10000);
    expect(verifierMotifRejet('😀'.repeat(10000))).toBeNull();
    expect(verifierMotifRejet('a'.repeat(10001))).toBe('MOTIF_TROP_LONG');
  });
});
