import { poweredBy } from "hono/powered-by"
import { Hono } from "hono"

import { prisma } from "./src/db/client"

const app = new Hono()

app.use(poweredBy())

app.get("/api/v1", (c) => c.json({ message: "Hello, from my REST API!" }))

export default app

const users = await prisma.user.findMany()
console.log(users)
