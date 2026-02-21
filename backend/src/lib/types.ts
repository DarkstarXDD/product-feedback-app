import type { JwtVariables } from "hono/jwt"

type JwtPayload = { userId: string; exp: number }

// type CurrentUser = {
//   role: "ADMIN" | "USER"
//   username: string
//   email: string
//   name: string
//   id: string
// }

// export type HonoInstanceVariables = {
//   currentUser: CurrentUser
// } & JwtVariables<JwtPayload>

type Role = "ADMIN" | "USER"

type AuthUser = {
  username: string
  email: string
  name: string
  id: string
  role: Role
}

type HonoInstanceVariables = {
  access?: {
    isAdmin: boolean
    isSelf: boolean
  }
  targetUser?: {
    username: string
    id: string
  }
  user?: AuthUser
} & JwtVariables<JwtPayload>

export type AppContext = {
  Variables: HonoInstanceVariables
}
