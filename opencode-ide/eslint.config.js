import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JS config
  js.configs.recommended,
  
  // TypeScript config
  ...tseslint.configs.recommended,
  
  // Next.js config
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  
  // React rules
  {
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  
  // Global ignores
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "electron/**",
    ],
  },
  
  // TypeScript/React files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  
  // Next.js pages/app directory
  {
    files: ["src/app/**/*"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
);
