import { HTTPException } from "hono/http-exception"
import { poweredBy } from "hono/powered-by"
import { Hono } from "hono"

import { authRoutes } from "@/routes/auth.routes"

const app = new Hono()

app.use(poweredBy())

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    console.log(err)
    return err.getResponse()
  }
  console.log(err)
  return c.json({ message: "Someting went wrong." }, 500)
})

app.get("/api/v1", (c) => c.json({ message: "Hello, from my REST API!" }))

app.route("/api/v1/auth", authRoutes)

export default app
