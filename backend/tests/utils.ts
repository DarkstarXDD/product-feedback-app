import { faker } from "@faker-js/faker"
import { hash } from "bcryptjs"
import { sign } from "hono/jwt"

import type { Role } from "@/lib/types"

import { JWT_TTL_SECONDS } from "@/routes/auth.routes"
import { generateSlug } from "@/lib/utils"
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
    userCleanup: async () => {
      await deleteDummyUser(user.id)
    },
    token,
    user,
  }
}

export async function createSuggestion() {
  const user = await createDummyUser("USER")
  const title = faker.lorem.sentence()

  const categories = await prisma.category.findMany()
  const categoryIndex = Math.floor(Math.random() * categories.length)
  const categoryId = categories[categoryIndex]?.id

  return prisma.suggestion.create({
    data: {
      description: faker.lorem.paragraph(),
      categoryId: categoryId ?? "",
      slug: generateSlug(title),
      userId: user.id,
      title: title,
    },
  })
}

export async function deleteSuggestion(id: string) {
  await prisma.suggestion.delete({ where: { id } })
}

export async function createComment() {
  const user = await createDummyUser("USER")
  const suggestion = await createSuggestion()

  const comment = await prisma.comment.create({
    data: {
      content: faker.lorem.paragraph(),
      suggestionId: suggestion.id,
      userId: user.id,
    },
  })

  return {
    commentCleanup: async () => {
      await deleteComment(comment.id)
      await deleteSuggestion(suggestion.id)
      await deleteDummyUser(user.id) // User is not getting deleted
    },
    comment,
  }
}

export async function deleteComment(id: string) {
  await prisma.comment.delete({ where: { id } })
}
