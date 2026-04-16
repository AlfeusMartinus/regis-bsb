import React from 'react';
import type { EventTheme, CssVars } from './types';

function toCssVars(theme: EventTheme): CssVars {
    const {
        palette,
        typography: { fontFamily, fontWeights },
    } = theme;

    // CSS variables ditulis sebagai string biar bisa langsung dipakai di future component/theme tokens.
    return {
        '--theme-id': theme.id,
        '--theme-font-family': fontFamily,

        '--font-weight-regular': String(fontWeights.regular),
        '--font-weight-medium': String(fontWeights.medium),
        '--font-weight-semibold': String(fontWeights.semibold),
        '--font-weight-bold': String(fontWeights.bold),
        '--font-weight-extrabold': String(fontWeights.extrabold),
        '--font-weight-black': String(fontWeights.black),

        '--color-primary': palette.primary,
        '--color-primary-dark': palette.primaryDark,
        '--color-background': palette.background,
        '--color-surface': palette.surface,
        '--color-text': palette.text,
        '--color-muted-text': palette.mutedText,
        '--color-border': palette.border,

        '--color-accent': palette.accent,
        '--color-accent-2': palette.accent2,

        '--color-success': palette.success,
        '--color-warning': palette.warning,
        '--color-error': palette.error,
    };
}

export interface EventThemeProviderProps {
    theme: EventTheme;
    children: React.ReactNode;
}

/**
 * Pembungkus halaman publik agar event bisa punya branding sendiri (font/color/assets)
 * tanpa mengubah logic form (nanti tinggal pakai CSS variables di layout/template baru).
 */
export const EventThemeProvider: React.FC<EventThemeProviderProps> = ({ theme, children }) => {
    const cssVars = toCssVars(theme);

    return (
        <div
            data-theme-event={theme.slug}
            style={
                {
                    ...cssVars,
                    fontFamily: 'var(--theme-font-family)',
                    color: 'var(--color-text)',
                } as React.CSSProperties
            }
        >
            {children}
        </div>
    );
};

