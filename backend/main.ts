import { HTTPException } from "hono/http-exception"
import { poweredBy } from "hono/powered-by"
import { logger } from "hono/logger"
import { Hono } from "hono"

import authRoutes from "@/routes/auth.routes"
import userRoutes from "@/routes/user.routes"

const app = new Hono()
const api = new Hono()

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

/** Mount instances on protected routes. */
api.route("/users", userRoutes)

/** Mount API instance on app. */
app.route("/api/v1", api)

export default app
