import { PrismaPg } from "@prisma/adapter-pg"

import env from "@/lib/env"

import { PrismaClient } from "../src/db/generated/prisma/client"
import { categories, statuses } from "../src/lib/data"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

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
