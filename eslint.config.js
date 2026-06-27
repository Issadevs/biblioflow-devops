import js from "@eslint/js";

const nodeGlobals = {
  console: "readonly",
  process: "readonly",
  Buffer: "readonly",
  AbortController: "readonly",
  AbortSignal: "readonly",
  fetch: "readonly",
  Response: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
};

export default [
  {
    ignores: [
      ".venv/**",
      "coverage/**",
      "node_modules/**",
      "output/**",
      "reports/**",
      "tmp/**",
    ],
  },
  js.configs.recommended,
  {
    files: [
      "src/**/*.js",
      "tests/**/*.js",
      "scripts/**/*.mjs",
      "vitest.config.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
    rules: {
      "no-console": ["error", { allow: ["info", "warn", "error"] }],
      "no-duplicate-imports": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "prefer-const": "error",
    },
  },
  {
    files: ["frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        HTMLElement: "readonly",
        Option: "readonly",
      },
    },
  },
];
