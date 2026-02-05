import { poweredBy } from "hono/powered-by"
import { Hono } from "hono"

const app = new Hono()

app.use(poweredBy())

app.get("/api/v1", (c) => c.json({ message: "Hello, from my REST API!" }))

export default app
