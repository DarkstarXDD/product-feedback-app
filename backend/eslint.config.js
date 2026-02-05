import perfectionist from "eslint-plugin-perfectionist"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"
import eslint from "@eslint/js"

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  perfectionist.configs["recommended-line-length"],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },

    rules: {
      "perfectionist/sort-modules": "off",
    },
  }
)
