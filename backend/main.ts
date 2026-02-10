import { HTTPException } from "hono/http-exception"
import { poweredBy } from "hono/powered-by"
import { jwt } from "hono/jwt"
import { Hono } from "hono"

import authRoutes from "@/routes/auth.routes"
import userRoutes from "@/routes/user.routes"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.")

const app = new Hono()
const publicRoutes = new Hono()
const protectedRoutes = new Hono()

app.use(poweredBy())

protectedRoutes.use(
  "*",
  jwt({ secret: JWT_SECRET, cookie: "token", alg: "HS256" })
)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    console.log(err)
    return err.getResponse()
  }
  console.log(err)
  return c.json({ message: "Someting went wrong." }, 500)
})

publicRoutes.get("/", (c) => c.json({ message: "Success" }))
publicRoutes.route("/auth", authRoutes)

protectedRoutes.route("/users", userRoutes)

app.route("/api/v1", publicRoutes)
app.route("/api/v1", protectedRoutes)

export default app
