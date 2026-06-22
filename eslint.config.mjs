import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// RECOMMENDATION: Install eslint-plugin-import to enforce consistent import ordering.
// Run: npm install -D eslint-plugin-import
// Then uncomment and add the config below.
//
// import importPlugin from 'eslint-plugin-import';
// In plugins: add importPlugin (or use import plugin syntax if using flat config v2)
// In rules:
//   'import/order': ['error', {
//     groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
//     'newlines-between': 'always',
//     alphabetize: { order: 'asc' },
//   }],
//
// There are 20+ files with import ordering violations currently.

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "rules/**",
    "_trash/**",
    "tests/**",
    ".opencode/**",
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
