import { HTTPException } from "hono/http-exception"
import { poweredBy } from "hono/powered-by"
import { logger } from "hono/logger"
import { Hono } from "hono"

import suggestionRoutes from "@/routes/suggestion.routes"
import categoryRoutes from "@/routes/category.routes"
import commentsRouter from "@/routes/comments.route"
import statusRoutes from "@/routes/status.routes"
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

api.route("/auth", authRoutes)
api.route("/users", userRoutes)
api.route("/categories", categoryRoutes)
api.route("/statuses", statusRoutes)
api.route("/suggestions", suggestionRoutes)
api.route("/comments", commentsRouter)

/** Mount API instance on app. */
app.route("/api/v1", api)

export default app
