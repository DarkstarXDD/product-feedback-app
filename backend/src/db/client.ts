import { PrismaLibSql } from "@prisma/adapter-libsql"

import { PrismaClient, Prisma } from "./generated/prisma/client"

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error("DATABASE_URL is not set")
}

const adapter = new PrismaLibSql({ url })

export const prisma = new PrismaClient({ adapter })
export { Prisma }
