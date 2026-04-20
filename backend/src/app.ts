import { structuredLogger } from "@hono/structured-logger"
import { HTTPException } from "hono/http-exception"
import { Scalar } from "@scalar/hono-api-reference"
import { openAPIRouteHandler } from "hono-openapi"
import { poweredBy } from "hono/powered-by"
import { requestId } from "hono/request-id"
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

// Pino-pretty is disabled in production. Logging is disabled in testing.
const pinoLogger = pino({
  transport:
    env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined,
  level: env.NODE_ENV === "test" ? "silent" : "trace",
})

const app = new Hono<{ Variables: { pinoLogger: Logger } }>()
const api = new Hono()

app.use(poweredBy())
app.use(requestId())

app.use(
  structuredLogger({
    createLogger: (c) => pinoLogger.child({ requestId: c.var.requestId }),
    onRequest: (logger, c) => {
      logger.info(
        {
          method: c.req.method,
          path: c.req.path,
          userAgent: c.req.header("user-agent"),
        },
        "incoming request"
      )
    },
  })
)

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
