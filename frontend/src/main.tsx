import "@/css/style.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "@/App";
import PaletteProvider from "@/palette-provider";
import ThemeProvider from "@/theme-provider";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element in index.html");

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PaletteProvider>
          <App />
        </PaletteProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
