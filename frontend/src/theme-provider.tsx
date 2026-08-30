import { type ReactNode, useCallback, useState } from "react";

import { type Theme, ThemeContext } from "@/theme-context";

function currentTheme(): Theme {
  // The inline script in index.html already resolved stored preference vs.
  // prefers-color-scheme before paint, so the class on <html> is the truth.
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode or blocked storage: the class still applies for this
      // session, the choice just will not survive a reload.
    }
    setThemeState(next);
  }, []);

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}
