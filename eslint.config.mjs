import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**", "out/**", "build/**", "next-env.d.ts",
    "coverage/**", "node_modules/**",
    ".opencode/**", ".hermes/**", "rules/**", "scripts/**", "drizzle/**",
  ]),
  {
    rules: {
      ...jsxA11y.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "no-console": "off",
      "curly": "off",
      "no-nested-ternary": "off",
      "consistent-return": "off",
    },
  },
]);

export default eslintConfig;
