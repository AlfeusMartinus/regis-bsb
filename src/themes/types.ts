export type FontWeightToken =
    | 'regular'
    | 'medium'
    | 'semibold'
    | 'bold'
    | 'extrabold'
    | 'black';

export type CssVars = Record<string, string>;

export interface EventThemePalette {
    /**
     * Warna-warna yang akan dipakai oleh design system event.
     * Catatan: nilai hex ini sementara, sesuaikan dengan palette Figma final.
     */
    primary: string;
    primaryDark: string;
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    border: string;

    accent: string;
    accent2: string;

    success: string;
    warning: string;
    error: string;
}

export interface EventThemeTypography {
    /**
     * Nilai harus valid untuk CSS `font-family`.
     * Contoh: `'Google Sans', sans-serif`.
     */
    fontFamily: string;
    fontWeights: Record<FontWeightToken, number>;
}

export interface EventThemeAssets {
    /**
     * Semua asset untuk event disarankan ada di `public/assets/events/<eventId>/...`
     * lalu direferensikan lewat path absolut `/assets/...`.
     */
    logoUrl?: string;
    backgroundOrnamentUrl?: string;
    lottieUrl?: string;
    iconSetUrl?: string;
}

export interface EventTheme {
    id: string;
    slug: string;
    palette: EventThemePalette;
    typography: EventThemeTypography;
    assets: EventThemeAssets;
}

export type EventThemeMap = Record<string, EventTheme>;

