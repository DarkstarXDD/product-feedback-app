import type { Context } from "hono"

import { compare, hash } from "bcryptjs"
import { setCookie } from "hono/cookie"
import { sign } from "hono/jwt"

import { JWT_TTL_SECONDS } from "@/lib/consts"
import env from "@/lib/env"

/** Returns the hash for a plain string password. A wrapper around `hash` from `bcryptjs` with a fixed salt. */
export async function hashPassword(password: string) {
  return hash(password, 10)
}

/** Returns whether the password is valid. A wrapper around `compare` from `bcryptjs`. */
export async function verifyPassword(
  plainStringPassword: string,
  hash: string
) {
  return compare(plainStringPassword, hash)
}

/** Creates and returns a JWT using the `userId` as the payload. */
export async function createJWT(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS
  const token = await sign({ userId, exp }, env.JWT_SECRET, "HS256")
  return token
}

/** Stores the signed auth token in a secure, HTTP only cookie. */
export function setAuthCookie(context: Context, token: string) {
  setCookie(context, "token", token, {
    maxAge: JWT_TTL_SECONDS,
    sameSite: "Lax",
    httpOnly: true,
    secure: true,
    path: "/",
  })
}
