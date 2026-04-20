import { HTTPException } from "hono/http-exception"
import { Scalar } from "@scalar/hono-api-reference"
import { openAPIRouteHandler } from "hono-openapi"
import { poweredBy } from "hono/powered-by"
import { type Logger, pino } from "pino"
import { Hono } from "hono"

import suggestionsRouter from "@/routes/suggestions.route"
import categoriesRouter from "@/routes/categories.route"
import commentsRouter from "@/routes/comments.route"
import statusesRouter from "@/routes/statuses.route"
import usersRouter from "@/routes/users.route"
import authRouter from "@/routes/auth.route"
import { jsonError } from "@/lib/responses"
import env from "@/lib/env"

// Turn off Pino pretty when in production
const pinoLogger = pino({
  ...(env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty" } }
    : {}),
  level: env.NODE_ENV === "test" ? "silent" : "trace",
})

const app = new Hono<{ Variables: { pinoLogger: Logger } }>()
const api = new Hono()

app.use(poweredBy())

app.use((c, next) => {
  const requestLogger = pinoLogger.child({
    requestId: crypto.randomUUID(),
    path: c.req.path,
    method: c.req.method,
  })
  c.set("pinoLogger", requestLogger)
  return next()
})

app.use(async (c, next) => {
  const log = c.get("pinoLogger")
  log.info({ method: c.req.method, path: c.req.path }, "incoming request")

  await next()

  log.info({ status: c.res.status }, "request completed")
})

/** By default Hono returns a text response for notFound. I wanted a JSON response. */
app.notFound((c) => {
  return jsonError(
    c,
    { message: "Not found", code: "NOT_FOUND" },
    { status: 404 }
  )
})

/** Global error handler. */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  return c.json({ message: "Something went wrong." }, 500)
})

app.get(
  "/openapi.json",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        description: "REST API for a Product Feedback App",
        title: "Product Feedback App",
        version: "1.0.0",
      },
    },
    includeEmptyPaths: true,
  })
)

app.get("/scalar", Scalar({ url: "/openapi.json" }))

api.route("/auth", authRouter)
api.route("/users", usersRouter)
api.route("/categories", categoriesRouter)
api.route("/statuses", statusesRouter)
api.route("/suggestions", suggestionsRouter)
api.route("/comments", commentsRouter)

/** Mount API instance on app. */
app.route("/api/v1", api)

export default app
