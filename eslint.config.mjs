import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `const { id: _, ...rest } = row` drops a field on purpose; that is not an unused variable.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true, argsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not the app: agent tooling, the client's source material, and the
    // one-off scripts that imported the old system's data.
    ".claude/**",
    "requirements/**",
    "data/**",
    "plans/**",
    "scripts/legacy-migration/**",
  ]),
]);

export default eslintConfig;
