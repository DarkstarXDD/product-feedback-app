import { defineConfig, env } from "prisma/config"

export default defineConfig({
  migrations: {
    seed: `bun run prisma/seed.ts`,
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
  schema: "prisma/schema.prisma",
})
