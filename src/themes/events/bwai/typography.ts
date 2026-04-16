import type { EventThemeTypography, FontWeightToken } from '../../types';

const fontWeights: Record<FontWeightToken, number> = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
};

/**
 * Font: Google Sans (sesuai permintaan).
 * Catatan: pastikan font ini ter-load (link Google Fonts atau font-file) saat layout publik dibuat.
 */
export const bwaiTypography: EventThemeTypography = {
    fontFamily: "'Google Sans', sans-serif",
    fontWeights,
};

