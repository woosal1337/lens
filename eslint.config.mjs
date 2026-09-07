import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unusedImports from "eslint-plugin-unused-imports";
import stylex from "@stylexjs/eslint-plugin";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: [".next/**", "out/**", "node_modules/**", "reference/**", "next-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "unused-imports": unusedImports,
      "@stylexjs": stylex
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      "@stylexjs/valid-styles": "error",

      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" }
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-useless-empty-export": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],

      "no-console": "error",
      "no-debugger": "error",
      "no-alert": "error",
      "no-inline-comments": "error",
      "no-unreachable": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-useless-concat": "error",
      "no-lonely-if": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "multi-line"],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      complexity: ["error", 15],

      "react/prop-types": "off",
      "react/jsx-no-useless-fragment": "error",
      "react/self-closing-comp": "error",
      "react/jsx-boolean-value": ["error", "never"],

      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message: "Use the @/ path alias instead of a relative parent import."
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      "app/**/*.tsx",
      "components/dashboard/**/*.tsx",
      "components/onboarding/**/*.tsx",
      "lib/**/*.ts"
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@astryxdesign/core",
              message:
                "Import from @/components/ui instead. Only the wrapper layer may touch Astryx directly."
            }
          ],
          patterns: [
            {
              group: ["../*"],
              message: "Use the @/ path alias instead of a relative parent import."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts", "styles/**/*.ts"],
    ignores: ["components/ui/icon.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message:
                "Import Icon or IconMark from @/components/ui instead. Only components/ui/icon.tsx may touch Lucide."
            },
            {
              name: "@astryxdesign/core",
              message:
                "Import from @/components/ui instead. Only the wrapper layer may touch Astryx directly."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["components/ui/**/*.tsx", "components/layout/**/*.tsx"],
    rules: { "no-restricted-imports": "off" }
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off"
    }
  },
  {
    files: ["*.mjs", "scripts/**/*.mjs", "*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: {
      "no-console": "off",
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    files: ["styles/theme/**/*.ts", "styles/theme/**/*.tsx"],
    rules: { "no-inline-comments": "off", "@typescript-eslint/no-unsafe-assignment": "off" }
  },
  {
    files: ["types/**/*.d.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off"
    }
  },
  prettier
);
