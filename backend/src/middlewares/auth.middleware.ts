import { jwt } from "hono/jwt"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

/** Validates the JWT from the cookie, and adds the JWT payload to the request context. */
export const authMw = jwt({ secret: JWT_SECRET, cookie: "token", alg: "HS256" })
