import perfectionist from "eslint-plugin-perfectionist"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"
import eslint from "@eslint/js"

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  perfectionist.configs["recommended-line-length"],
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "perfectionist/sort-modules": "off",
    },

    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  }
)
