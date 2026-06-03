import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Disabling ESLint
export default defineConfig([
  {
    ignores: ["**/dist/**", "**/build/**", "node_modules/**"],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx,tsx}"],
    languageOptions: {
      globals: globals.browser,
      sourceType: "module",
      ecmaVersion: "latest",
    },
  },
  {
    files: ["**/*.{ts,mts,cts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        sourceType: "module",
      },
    },
    rules: {},
  },
]);
