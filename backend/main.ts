import { HTTPException } from "hono/http-exception"
import { poweredBy } from "hono/powered-by"
import { jwt } from "hono/jwt"
import { Hono } from "hono"

import authRoutes from "@/routes/auth.routes"
import userRoutes from "@/routes/user.routes"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

const app = new Hono()
const publicRoutes = new Hono()
const protectedRoutes = new Hono()

/** poweredBy middleware runs on all routes. */
app.use(poweredBy())

/** Global error handler. */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    console.log(err)
    return err.getResponse()
  }
  console.log(err)
  return c.json({ message: "Someting went wrong." }, 500)
})

/** JWT middleware runs on all routes that are mounted in the protectedRoutes Hono instance.  */
protectedRoutes.use(jwt({ secret: JWT_SECRET, cookie: "token", alg: "HS256" }))

/** Mount `authRoutes` Hono instance at `/auth` base path, on the publicRoutes Hono instance.  */
publicRoutes.route("/auth", authRoutes)

/** A GET handler mounted on the `/` base path on the publicRoutes Hono instance.  */
publicRoutes.get("/", (c) => c.json({ message: "Success" }))

/** Mount `userRoutes` Hono instance on the `/users` base path on the protectedRoutes Hono instance.
 * Because we are running the JWT middleware on all routes on the protectedRoutes instance, any route instance mounted on protectedRoutes will be protected by default.
 */
protectedRoutes.route("/users", userRoutes)

app.route("/api/v1", publicRoutes)
app.route("/api/v1", protectedRoutes)

export default app
