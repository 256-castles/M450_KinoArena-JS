import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["client/dist/", "coverage/", "reports/", ".stryker-tmp/", "tmp/"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node }
  },
  {
    files: ["client/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["router", "useAuth", "useFlash"] }
      ]
    }
  },
  {
    files: ["**/*.test.{js,jsx}", "**/*.spec.{js,jsx}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  }
];
