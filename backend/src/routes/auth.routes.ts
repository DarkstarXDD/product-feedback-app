import { Hono } from "hono"

import { jsonSuccess } from "@/lib/utils"

const auth = new Hono()

auth.post("/signin", (c) => jsonSuccess(c, { message: "Success" }))
auth.post("/signup", (c) => jsonSuccess(c, { message: "Success" }))
auth.post("/signout", (c) => jsonSuccess(c, { message: "Success" }))

export { auth as authRoutes }
