import type { Prisma } from "@/db/client"

export const publicUserSelect = {
  username: true,
  name: true,
} as const satisfies Prisma.UserSelect

export const privateUserSelect = {
  username: true,
  email: true,
  name: true,
} as const satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect
}>
export type PrivateUser = Prisma.UserGetPayload<{
  select: typeof privateUserSelect
}>
