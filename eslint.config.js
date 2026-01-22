import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "*.config.js", "*.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React rules
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { 
          allowConstantExport: true,
          allowExportNames: [
            "badgeVariants",
            "buttonVariants",
            "chartConfig",
            "toastVariants",
            "toggleVariants",
            "alertVariants",
            "navigationMenuTriggerStyle"
          ]
        },
      ],
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",

      // TypeScript strict rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",

      // Console enforcement - use secureLog (errors/security) or cLog (dev-only) instead
      // Import from '@/utils/secureLogging' or '@/utils/conditionalLogger'
      "no-console": "error",

      // Code quality
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      "no-duplicate-imports": "error",
      "curly": ["error", "all"],
      "no-useless-escape": "error",
      "no-template-curly-in-string": "warn",
      "default-case": "warn",

      // Complexity guards
      "complexity": ["warn", { max: 15 }],
      "max-depth": ["warn", { max: 4 }],
      "max-lines-per-function": ["warn", { 
        max: 150, 
        skipBlankLines: true, 
        skipComments: true 
      }],
    },
  },
  // E2E tests - disable React rules
  {
    files: ["tests-e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-console": "off",
    },
  },
  // Unit/Component tests - relaxed rules
  {
    files: ["tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      "max-lines-per-function": "off",
    },
  },
  // Storybook files - add parser options for TypeScript
  {
    files: ["**/*.stories.{ts,tsx}", ".storybook/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "no-console": "off",
      "max-lines-per-function": "off",
    },
  },
  // Edge functions (Deno)
  {
    files: ["supabase/functions/**/*.ts"],
    rules: {
      "no-console": "off", // Edge functions use console for logging
    },
  }
);
