import { type HonoLogLayerVariables, honoLogLayer } from "@loglayer/hono"
import { PinoTransport } from "@loglayer/transport-pino"
import { HTTPException } from "hono/http-exception"
import { Scalar } from "@scalar/hono-api-reference"
import { openAPIRouteHandler } from "hono-openapi"
import { poweredBy } from "hono/powered-by"
import { LogLayer } from "loglayer"
import { Hono } from "hono"
import { pino } from "pino"

import suggestionRoutes from "@/routes/suggestion.routes"
import categoryRoutes from "@/routes/category.routes"
import commentsRouter from "@/routes/comments.route"
import statusRoutes from "@/routes/status.routes"
import authRoutes from "@/routes/auth.routes"
import userRoutes from "@/routes/user.routes"
import { jsonError } from "@/lib/utils"

const p = pino({
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: { target: "pino-pretty" },
      }
    : {}),
  level: "trace", // Enable all log levels
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
  openAPIRouteHandler(api, {
    documentation: {
      info: {
        description: "REST API for a Product Feedback App",
        title: "Product Feedback App",
        version: "1.0.0",
      },
    },
  })
)

app.get("/scalar", Scalar({ url: "/openapi.json" }))

api.route("/auth", authRoutes)
api.route("/users", userRoutes)
api.route("/categories", categoryRoutes)
api.route("/statuses", statusRoutes)
api.route("/suggestions", suggestionRoutes)
api.route("/comments", commentsRouter)

/** Mount API instance on app. */
app.route("/api/v1", api)

export default app
