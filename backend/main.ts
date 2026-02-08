import { poweredBy } from "hono/powered-by"
import { Hono } from "hono"

import { authRoutes } from "@/routes/auth.routes"

const app = new Hono()

app.use(poweredBy())

app.get("/api/v1", (c) => c.json({ message: "Hello, from my REST API!" }))

app.route("/api/v1/auth", authRoutes)

export default app
