import type { EventTheme } from '../../types';
import { bwaiPalette } from './palette';
import { bwaiTypography } from './typography';
import { bwaiAssets } from './assets';

export const bwaiTheme: EventTheme = {
    id: 'bwai',
    slug: 'bwai',
    palette: bwaiPalette,
    typography: bwaiTypography,
    assets: bwaiAssets,
};

