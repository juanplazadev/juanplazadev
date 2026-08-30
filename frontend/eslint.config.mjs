import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // .flat: the top-level configs.* entries are still eslintrc-shaped
      // (plugins as an array) and ESLint 10 rejects them.
      reactHooks.configs.flat["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Carried over from the pre-Vite config. The Cruip carousel in
      // Recommendations.tsx leans on intentional imperative patterns — reading
      // refs during render, short-circuit statements, hoisted handlers — that
      // these rules flag. Surfaced as warnings so they stay visible without
      // failing the lint run over template code.
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
  // Must stay last so it can switch off the stylistic rules the configs above turn on.
  prettier,
);
