import { createContext, use } from 'react';

import type { Palette } from '@/types/content';

export const PALETTE_COOKIE = 'palette';
export const PALETTE_STORAGE_KEY = 'palette';

export type PaletteContextValue = {
    /** The active palette id. */
    palette: string;
    /** Every palette the server knows about, in picker order. */
    palettes: Palette[];
    setPalette: (palette: string) => void;
};

export const PaletteContext = createContext<PaletteContextValue | null>(null);

/*
  Kept out of the provider module so fast refresh keeps working: it only
  handles modules that export components and nothing else.
*/
export function usePalette(): PaletteContextValue {
    const context = use(PaletteContext);

    if (!context) {
        throw new Error('usePalette must be used within a PaletteProvider');
    }

    return context;
}
