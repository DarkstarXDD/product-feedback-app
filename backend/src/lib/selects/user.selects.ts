import type { Prisma } from "@/db/client"

/** Fields that are included when a public user data. */
export const publicUserSelect = {
  username: true,
  name: true,
} as const satisfies Prisma.UserSelect

export type PublicUserResponse = Prisma.UserGetPayload<{
  select: typeof publicUserSelect
}>

/** Fields that are included when an admin or own user requests user data. Excludes password and relation fields. */
export const privateUserSelect = {
  createdAt: true,
  updatedAt: true,
  username: true,
  _count: true,
  email: true,
  role: true,
  name: true,
  id: true,
} as const satisfies Prisma.UserSelect

export type PrivateUserResponse = Prisma.UserGetPayload<{
  select: typeof privateUserSelect
}>
