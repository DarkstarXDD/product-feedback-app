import { PrismaPg } from "@prisma/adapter-pg"

import env from "@/lib/env"

import { PrismaClient, Prisma } from "./generated/prisma/client"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({
  adapter,
  // log: ["query", "info", "warn", "error"],
})
export { Prisma }
