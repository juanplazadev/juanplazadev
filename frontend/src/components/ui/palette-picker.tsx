import { type KeyboardEvent, useRef } from "react";

import { PALETTES, usePalette } from "@/palette-context";

/*
  A radio group rather than a row of independent buttons: picking a palette is
  one choice out of five, and the group takes a single tab stop with arrow keys
  moving between the dots, instead of putting five stops ahead of the page
  content. That means managing focus by hand - the roving tabindex below is what
  the pattern requires.
*/
export default function PalettePicker() {
  const { palette, setPalette } = usePalette();
  const groupRef = useRef<HTMLDivElement>(null);

  // Arrow keys select and move focus in one step, which is the expected
  // behaviour for a radio group and doubles as a way to preview each palette.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();

    const index = PALETTES.findIndex((entry) => entry.id === palette);
    // Wraps at both ends, so the group never dead-ends on a keypress.
    const next = PALETTES[(index + step + PALETTES.length) % PALETTES.length];
    setPalette(next.id);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-palette-option="${next.id}"]`)?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Color palette"
      onKeyDown={onKeyDown}
      className="border-border bg-card flex items-center gap-1 rounded-full border p-1"
    >
      {PALETTES.map((entry) => {
        const isActive = entry.id === palette;
        return (
          <button
            key={entry.id}
            type="button"
            role="radio"
            data-palette-option={entry.id}
            aria-checked={isActive}
            // Only the checked dot is tabbable; the rest are reached with the
            // arrow keys handled above.
            tabIndex={isActive ? 0 : -1}
            onClick={() => setPalette(entry.id)}
            title={entry.label}
            aria-label={entry.label}
            className="focus-visible:ring-ring focus-visible:ring-offset-card flex h-5 w-5 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          >
            {/*
              The swatch is a child rather than the button itself so the active
              ring can sit outside the dot without changing the hit target, and
              so the button keeps a comfortable 20px tap area around a 10px dot.
            */}
            <span
              aria-hidden="true"
              style={{ backgroundColor: entry.swatch }}
              className={`ring-offset-card block rounded-full transition-all ${
                isActive ? "ring-primary h-3 w-3 ring-2 ring-offset-1" : "h-2.5 w-2.5 opacity-60 hover:opacity-100"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
