import { defineConfig } from "prisma/config"

import env from "@/lib/env"

export default defineConfig({
  migrations: {
    seed: `bun run prisma/seed.ts`,
    path: "prisma/migrations",
  },
  datasource: {
    url: env.DATABASE_URL,
  },
  schema: "prisma/schema.prisma",
})
