import { describe, expect, test } from "vitest"

import authRoutes from "@/routes/auth.routes"

import { createDummyUserData } from "./utils"

describe("POST /api/v1/auth/signup", () => {
  test("returns 200 and created user for valid payload", async () => {
    const payload = createDummyUserData()

    const res = await authRoutes.request("/signup", {
      body: JSON.stringify(payload),
      method: "POST",
    })

    expect(res.status).toBe(201)
  })
})
