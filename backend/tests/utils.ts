import { faker } from "@faker-js/faker"

import type { Role } from "@/lib/types"

import { hashPassword, createJWT } from "@/lib/session"
import { generateSlug } from "@/lib/utils"
import { prisma } from "@/db/client"

export function createUserData() {
  const password = faker.internet.password()

  return {
    name: faker.person.fullName(),
    username: faker.internet.username(),
    email: faker.internet.email(),
    password: password,
    confirmPassword: password,
  }
}

export async function createUser(role: Role) {
  const userData = createUserData()
  const hashedPassword = await hashPassword(userData.password)

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      username: userData.username,
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      role: role,
    },
  })

  return {
    user,
    userPassword: userData.password,
  }
}

export async function createUserSession(role: Role) {
  const { user } = await createUser(role)
  const token = await createJWT(user.id)
  return { user, token }
}

export async function getRandomCategoryId() {
  const categories = await prisma.category.findMany()

  if (categories.length === 0) {
    throw new Error(
      "Test setup error: no categories found. Seed the categories in the database."
    )
  }

  const category = faker.helpers.arrayElement(categories)
  return category.id
}

/** Low level helper. Creates a suggestion. Caller must provide the owner. */
export async function createSuggestion(ownerId: string) {
  const title = faker.lorem.sentence()
  const categoryId = await getRandomCategoryId()

  const suggestion = await prisma.suggestion.create({
    data: {
      categoryId,
      userId: ownerId,
      title: title,
      slug: generateSlug(title),
      description: faker.lorem.paragraph(),
    },
  })
  return suggestion
}

/**
 * High level helper that orchestrates a suggestion creation.
 * If an ownerId is passed, uses that. Else creates a new user and use their userId as the owner.
 */
export async function createSuggestionScenario(suggestionOwnerId?: string) {
  if (suggestionOwnerId) {
    const suggestion = await createSuggestion(suggestionOwnerId)
    return suggestion
  }

  const { user: suggestionOwner } = await createUser("USER")
  const suggestion = await createSuggestion(suggestionOwner.id)
  return suggestion
}

/** Low level helper. Creates a comment. Caller must provide the owner and suggestion. */
export async function createComment(input: {
  suggestionId: string
  ownerId: string
}) {
  const comment = await prisma.comment.create({
    data: {
      suggestionId: input.suggestionId,
      userId: input.ownerId,
      content: faker.lorem.paragraph(),
    },
  })
  return comment
}

/** Low level helper. Creates an upvote. Caller must provide the owner and suggestion. */
export async function createUpvote(input: {
  suggestionId: string
  ownerId: string
}) {
  const upvote = await prisma.upvote.create({
    data: {
      suggestionId: input.suggestionId,
      userId: input.ownerId,
    },
  })
  return upvote
}

/**
 * High level helper that orchestrates a comment creation.
 * If an ownerId is passed, uses that. Else creates a new user and use their userId as the owner.
 */
export async function createCommentScenario(commentOwnerId?: string) {
  if (commentOwnerId) {
    const { user: suggestionOwner } = await createUser("USER")
    const suggestion = await createSuggestion(suggestionOwner.id)

    const comment = await createComment({
      suggestionId: suggestion.id,
      ownerId: commentOwnerId,
    })
    return { comment, suggestion }
  }

  const { user: suggestionOwner } = await createUser("USER")
  const { user: commentOwner } = await createUser("USER")

  const suggestion = await createSuggestion(suggestionOwner.id)

  const comment = await createComment({
    suggestionId: suggestion.id,
    ownerId: commentOwner.id,
  })
  return { comment, suggestion }
}

export async function cleanupDb() {
  await prisma.upvote.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.suggestion.deleteMany()
  await prisma.user.deleteMany()
}
