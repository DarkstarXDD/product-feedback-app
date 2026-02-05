import { PrismaLibSql } from "@prisma/adapter-libsql"

import { PrismaClient, Prisma } from "../src/db/generated/prisma/client"

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error("DATABASE_URL is not set")
}

const adapter = new PrismaLibSql({ url })

const prisma = new PrismaClient({ adapter })

async function main() {
  const data: Prisma.UserCreateInput[] = [
    { email: "harry@email.com", name: "Harry" },
    { email: "ron@email.com", name: "Ron" },
    { email: "hermione@email.com", name: "Hermione" },
  ]

  await prisma.user.createMany({ data })
}

main()
  .catch((error: unknown) => {
    console.log(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
