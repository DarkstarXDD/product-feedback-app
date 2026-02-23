import type { Prisma } from "@/db/client"

export const publicUserSelect = {
  username: true,
  name: true,
} as const satisfies Prisma.UserSelect

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

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect
}>
export type PrivateUser = Prisma.UserGetPayload<{
  select: typeof privateUserSelect
}>
