import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"
import { loadEnv } from "vite"
import path from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  return {
    // https://vitest.dev/guide/features#environment-variables
    test: {
      env: loadEnv(mode, __dirname, ""),
      reporters: ["verbose"],
      maxWorkers: 1,
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  }
})
