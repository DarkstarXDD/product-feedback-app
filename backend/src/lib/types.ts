import type { JwtVariables } from "hono/jwt"

type JwtPayload = { userId: string; exp: number }

type CurrentUser = {
  role: "ADMIN" | "USER"
  username: string
  email: string
  name: string
  id: string
}

export type HonoInstanceVariables = {
  currentUser: CurrentUser
} & JwtVariables<JwtPayload>
