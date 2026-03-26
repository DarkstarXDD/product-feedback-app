import type { Prisma } from "@/db/client"

/** Fields that are included when public requests user data. */
export const publicUserSelect = {
  name: true,
  username: true,
} as const satisfies Prisma.UserSelect

export type PublicUserResponse = Prisma.UserGetPayload<{
  select: typeof publicUserSelect
}>

/** Fields that are included when an admin or own user requests user data. Excludes password and relation fields. */
export const privateUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  _count: true,
} as const satisfies Prisma.UserSelect

export type PrivateUserResponse = Prisma.UserGetPayload<{
  select: typeof privateUserSelect
}>
