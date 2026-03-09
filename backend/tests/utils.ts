import { faker } from "@faker-js/faker"
import { hash } from "bcryptjs"
import { sign } from "hono/jwt"

import type { Role } from "@/lib/types"

import { JWT_TTL_SECONDS } from "@/routes/auth.routes"
import { prisma } from "@/db/client"

const JWT_SECRET = process.env.JWT_SECRET

export function createDummyUserData() {
  const password = faker.internet.password()

  return {
    username: faker.internet.username(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    confirmPassword: password,
    password: password,
  }
}

export async function createDummyUser(role: Role) {
  const userData = createDummyUserData()

  const hashedPassword = await hash(userData.password, 10)

  const user = await prisma.user.create({
    data: {
      email: userData.email.toLowerCase(),
      username: userData.username,
      password: hashedPassword,
      name: userData.name,
      role: role,
    },
  })

  return user
}

export async function deleteDummyUser(id: string) {
  await prisma.user.delete({ where: { id } })
}

export async function createUserSession(role: Role) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

  const user = await createDummyUser(role)

  const exp = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS
  const token = await sign({ userId: user.id, exp }, JWT_SECRET, "HS256")

  return {
    cleanup: async () => {
      await deleteDummyUser(user.id)
    },
    token,
    user,
  }
}
