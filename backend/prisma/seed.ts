import { PrismaLibSql } from "@prisma/adapter-libsql"

import { PrismaClient } from "../src/db/generated/prisma/client"
import { categories, statuses } from "../src/lib/data"

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error("DATABASE_URL is not set")
}

const adapter = new PrismaLibSql({ url })

const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.status.createMany({ data: statuses })
  await prisma.category.createMany({ data: categories })
}

main()
  .catch((error: unknown) => {
    console.log(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
