import { type HonoLogLayerVariables, honoLogLayer } from "@loglayer/hono"
import { PinoTransport } from "@loglayer/transport-pino"
import { HTTPException } from "hono/http-exception"
import { Scalar } from "@scalar/hono-api-reference"
import { openAPIRouteHandler } from "hono-openapi"
import { poweredBy } from "hono/powered-by"
import { LogLayer } from "loglayer"
import { Hono } from "hono"
import { pino } from "pino"

import suggestionRouter from "@/routes/suggestions.route"
import categoryRoutes from "@/routes/categories.route"
import commentsRouter from "@/routes/comments.route"
import statusRoutes from "@/routes/statuses.route"
import userRoutes from "@/routes/users.route"
import authRouter from "@/routes/auth.route"
import { jsonError } from "@/lib/responses"
import env from "@/lib/env"

// Turn off Pino pretty when in production
const p = pino({
  ...(env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty" } }
    : {}),
  level: env.NODE_ENV === "test" ? "silent" : "trace",
})

const logLayer = new LogLayer({
  transport: new PinoTransport({
    logger: p,
  }),
})

const app = new Hono<{ Variables: HonoLogLayerVariables }>()
const api = new Hono()

app.use(poweredBy())
app.use(honoLogLayer({ instance: logLayer }))

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
  const logger = c.get("logger")
  logger.errorOnly(err)

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
api.route("/users", userRoutes)
api.route("/categories", categoryRoutes)
api.route("/statuses", statusRoutes)
api.route("/suggestions", suggestionRouter)
api.route("/comments", commentsRouter)

/** Mount API instance on app. */
app.route("/api/v1", api)

export default app
