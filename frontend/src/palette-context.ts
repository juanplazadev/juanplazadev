import { createContext, use } from "react";

/*
  The palette registry. Kept here rather than in the picker so the provider, the
  picker and the type all read from one list, and adding a palette is a single
  entry plus a block in css/additional-styles/palettes.css.

  `swatch` points at a --swatch-* variable rather than holding a colour, so the
  actual values stay in palettes.css and are never copied into two places. It
  cannot use --accent-500: the dots show all six palettes at once, and that only
  ever resolves to the active one.
*/
export const PALETTES = [
  { id: "ember", label: "Ember", swatch: "var(--swatch-ember)" },
  { id: "moss", label: "Moss", swatch: "var(--swatch-moss)" },
  { id: "lagoon", label: "Lagoon", swatch: "var(--swatch-lagoon)" },
  { id: "cobalt", label: "Cobalt", swatch: "var(--swatch-cobalt)" },
  { id: "orchid", label: "Orchid", swatch: "var(--swatch-orchid)" },
  { id: "crimson", label: "Crimson", swatch: "var(--swatch-crimson)" },
] as const;

export type Palette = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: Palette = "ember";

export const PALETTE_STORAGE_KEY = "palette";

export function isPalette(value: unknown): value is Palette {
  return PALETTES.some((palette) => palette.id === value);
}

export type PaletteContextValue = {
  palette: Palette;
  setPalette: (palette: Palette) => void;
};

export const PaletteContext = createContext<PaletteContextValue | null>(null);

// Kept out of palette-provider.tsx for the same reason useTheme is kept out of
// theme-provider.tsx: fast refresh only works on modules that export components
// and nothing else.
export function usePalette() {
  const context = use(PaletteContext);
  if (!context) throw new Error("usePalette must be used within a PaletteProvider");
  return context;
}
