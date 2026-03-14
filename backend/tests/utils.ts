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

  return {
    userCleanup: async () =>
      await prisma.user.delete({ where: { id: user.id } }),
    userPassword: userData.password,
    user,
  }
}

export async function createUserSession(role: Role) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

  const { userCleanup, user } = await createDummyUser(role)

  const exp = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS
  const token = await sign({ userId: user.id, exp }, JWT_SECRET, "HS256")

  return {
    userCleanup,
    token,
    user,
  }
}

/**
 * Low level helper.
 * Creates only a suggestion.
 * Caller must provide the owner.
 */
export async function createSuggestion(input: { ownerId: string }) {
  const title = faker.lorem.sentence()

  const categories = await prisma.category.findMany()

  if (categories.length === 0) {
    throw new Error(
      "Test setup error: no categories found. Seed the categories in the database."
    )
  }

  const category = faker.helpers.arrayElement(categories)

  const suggestion = await prisma.suggestion.create({
    data: {
      description: faker.lorem.paragraph(),
      slug: generateSlug(title),
      categoryId: category.id,
      userId: input.ownerId,
      title: title,
    },
  })

  return {
    suggestionCleanup: async () => {
      await prisma.suggestion.delete({ where: { id: suggestion.id } })
    },
    suggestion,
  }
}

/**
 * High level scenario helper for suggestion tests.
 * Creates a suggestion and any missing owner required for it.
 * If `suggestionOwnerId` is provided, that existing user is used as the suggestion owner
 * and is not deleted by the returned cleanup function.
 */
export async function createSuggestionScenario(suggestionOwnerId?: string) {
  if (suggestionOwnerId) {
    const { suggestionCleanup, suggestion } = await createSuggestion({
      ownerId: suggestionOwnerId,
    })

    return {
      suggestionScenarioCleanup: async () => {
        await suggestionCleanup()
      },
      suggestion,
    }
  }

  const { userCleanup: suggestionOwnerCleanup, user: suggestionOwner } =
    await createDummyUser("USER")

  const { suggestionCleanup, suggestion } = await createSuggestion({
    ownerId: suggestionOwner.id,
  })

  return {
    suggestionScenarioCleanup: async () => {
      await suggestionCleanup()
      await suggestionOwnerCleanup()
    },
    suggestion,
  }
}

/**
 * Low level helper.
 * Creates only a comment.
 * Caller must provide both owner and suggestion.
 */
export async function createComment(input: {
  suggestionId: string
  ownerId: string
}) {
  const comment = await prisma.comment.create({
    data: {
      content: faker.lorem.paragraph(),
      suggestionId: input.suggestionId,
      userId: input.ownerId,
    },
  })

  return {
    commentCleanup: async () => {
      await prisma.comment.delete({ where: { id: comment.id } })
    },
    comment,
  }
}

/**
 * High level scenario helper for comment tests.
 * Creates a suggestion, a comment, and any missing owners required for them.
 * If `commentOwnerId` is provided, that existing user is used as the comment owner
 * and is not deleted by the returned cleanup function.
 */
export async function createCommentScenario(commentOwnerId?: string) {
  if (commentOwnerId) {
    const { userCleanup: suggestionOwnerCleanup, user: suggestionOwner } =
      await createDummyUser("USER")

    const { suggestionCleanup, suggestion } = await createSuggestion({
      ownerId: suggestionOwner.id,
    })

    const { commentCleanup, comment } = await createComment({
      suggestionId: suggestion.id,
      ownerId: commentOwnerId,
    })

    return {
      commentScenarioCleanup: async () => {
        await commentCleanup()
        await suggestionCleanup()
        await suggestionOwnerCleanup()
      },
      comment,
    }
  }

  const { userCleanup: suggestionOwnerCleanup, user: suggestionOwner } =
    await createDummyUser("USER")

  const { userCleanup: commentOwnerCleanup, user: commentOwner } =
    await createDummyUser("USER")

  const { suggestionCleanup, suggestion } = await createSuggestion({
    ownerId: suggestionOwner.id,
  })

  const { commentCleanup, comment } = await createComment({
    suggestionId: suggestion.id,
    ownerId: commentOwner.id,
  })

  return {
    commentScenarioCleanup: async () => {
      await commentCleanup()
      await suggestionCleanup()
      await commentOwnerCleanup()
      await suggestionOwnerCleanup()
    },
    comment,
  }
}
