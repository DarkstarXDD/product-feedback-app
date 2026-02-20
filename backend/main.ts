import { HTTPException } from "hono/http-exception"
import { poweredBy } from "hono/powered-by"
import { logger } from "hono/logger"
import { Hono } from "hono"

import { authMw } from "@/middlewares/auth.middleware"
import authRoutes from "@/routes/auth.routes"
import userRoutes from "@/routes/user.routes"
import meRoutes from "@/routes/me.routes"

// const app = new Hono()
// const publicRoutes = new Hono()
// const protectedRoutes = new Hono()

// const JWT_SECRET = process.env.JWT_SECRET
// if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

// /** poweredBy middleware runs on all routes. */
// app.use(poweredBy())

// /** Global error handler. */
// app.onError((err, c) => {
//   if (err instanceof HTTPException) {
//     console.log(err)
//     return err.getResponse()
//   }
//   console.log(err)
//   return c.json({ message: "Someting went wrong." }, 500)
// })

// /** JWT middleware runs on all routes that are mounted in the protectedRoutes Hono instance.  */
// protectedRoutes.use(jwt({ secret: JWT_SECRET, cookie: "token", alg: "HS256" }))

// /** Mount `authRoutes` Hono instance at `/auth` base path, on the publicRoutes Hono instance.  */
// publicRoutes.route("/auth", authRoutes)

// /** A GET handler mounted on the `/` base path on the publicRoutes Hono instance.  */
// publicRoutes.get("/", (c) => c.json({ message: "Success" }))

// /** Mount `userRoutes` Hono instance on the `/users` base path on the protectedRoutes Hono instance.
//  * Because we are running the JWT middleware on all routes on the protectedRoutes instance, any route instance mounted on protectedRoutes will be protected by default.
//  */
// protectedRoutes.route("/users", userRoutes)

// app.route("/api/v1", publicRoutes)
// app.route("/api/v1", protectedRoutes)
// app.all("*", (c) => c.body("404 not found", 404))

const app = new Hono()
const api = new Hono()

/** poweredBy middleware runs on all routes. */
app.use(poweredBy())
app.use(logger())

/** Global error handler. */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    console.log(err)
    return err.getResponse()
  }
  console.log(err)
  return c.json({ message: "Something went wrong." }, 500)
})

/** All routes on `api` are public by default. Mount `auth` instance on it. */
api.route("/auth", authRoutes)
api.get("/", (c) => c.json({ message: "Success" }))

/** Apply auth middleware to only needed routes. So these are protected routes. */
api.use("/users/*", authMw)
api.use("/posts/*", authMw)
api.use("/comments/*", authMw)

/** Mount instances on protected routes. */
api.route("/users/me", meRoutes)
api.route("/users", userRoutes)

/** Mount API instance on app. */
app.route("/api/v1", api)

export default app
