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

publicRoutes.route("/api/v1/auth", authRoutes)
protectedRoutes.route("/api/v1/users", userRoutes)

app.route("/", publicRoutes)
app.route("/", protectedRoutes)

export default app
