import { type ReactNode, useCallback, useState } from "react";

import { DEFAULT_PALETTE, isPalette, type Palette, PALETTE_STORAGE_KEY, PaletteContext } from "@/palette-context";

function currentPalette(): Palette {
  // The inline script in index.html already resolved stored preference before
  // paint, so the attribute on <html> is the truth.
  const value = document.documentElement.dataset.palette;
  return isPalette(value) ? value : DEFAULT_PALETTE;
}

export default function PaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>(currentPalette);

  const setPalette = useCallback((next: Palette) => {
    document.documentElement.dataset.palette = next;
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the attribute still applies for this
      // session, the choice just will not survive a reload.
    }
    setPaletteState(next);
  }, []);

  return <PaletteContext value={{ palette, setPalette }}>{children}</PaletteContext>;
}
