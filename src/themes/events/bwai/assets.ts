import type { EventThemeAssets } from '../../types';

/**
 * Metode men-deploy asset dari Figma:
 * 1) Export logo/ilustrasi sebagai SVG/PNG dari Figma.
 * 2) Taruh ke `public/assets/events/bwai/`.
 * 3) Referensikan pakai path absolut `/assets/events/bwai/<file>`.
 *
 * Contoh:
 *  - logoUrl: '/assets/events/bwai/logo.svg'
 *  - backgroundOrnamentUrl: '/assets/events/bwai/ornament-bg.svg'
 *  - lottieUrl: '/assets/events/bwai/ornament.json'
 *
 * Catatan: isi path file-nya setelah asset final diekspor dari Figma.
 */
export const bwaiAssets: EventThemeAssets = {
    logoUrl: '/assets/events/bwai/logo.svg',
    backgroundOrnamentUrl: '/assets/events/bwai/ornament-bg.svg',
    lottieUrl: '/assets/events/bwai/ornament.json',
    iconSetUrl: '/assets/events/bwai/icons.svg',
};

