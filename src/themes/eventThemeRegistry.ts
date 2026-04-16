import type { EventThemeMap, EventTheme } from './types';
import { bwaiTheme } from './events/bwai/bwaiTheme';

const themes: EventThemeMap = {
    [bwaiTheme.slug]: bwaiTheme,
};

export function getEventThemeBySlug(slug: string | undefined | null): EventTheme | null {
    if (!slug) return null;
    return themes[slug] ?? null;
}

