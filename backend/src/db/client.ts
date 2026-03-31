import { PrismaLibSql } from "@prisma/adapter-libsql"

import env from "@/lib/env"

import { PrismaClient, Prisma } from "./generated/prisma/client"

const adapter = new PrismaLibSql({ url: env.DATABASE_URL })

export const prisma = new PrismaClient({
  adapter,
  // log: ["query", "info", "warn", "error"],
})
export { Prisma }
