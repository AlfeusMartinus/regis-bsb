import type React from 'react';
import type { EventTheme } from '../../themes/types';
import type { PublicEventTemplateProps } from './types';
import { BwaiPublicTemplate } from './bwai/BwaiPublicTemplate';

export type PublicEventTemplateComponent = React.FC<PublicEventTemplateProps>;

export const publicEventTemplates: Record<string, PublicEventTemplateComponent> = {
    bwai: BwaiPublicTemplate,
};

export function getPublicEventTemplateBySlug(slug: string | undefined | null): PublicEventTemplateComponent | null {
    if (!slug) return null;
    return publicEventTemplates[slug] ?? null;
}

// Export untuk dipakai nanti jika kamu ingin mapping theme/layout lebih eksplisit.
export function getEventThemeIdForTemplateSlug(slug: string | undefined | null): string | null {
    if (!slug) return null;
    const theme = (slug === 'bwai' ? ('bwai' as EventTheme['id']) : null);
    return theme;
}

