import { describe, expect, test } from "vitest"

import authRoutes from "@/routes/auth.routes"

import { createDummyUserData } from "./utils"

type SignupResponse = {
  data: {
    createdAt: string
    username: string
    email: string
    name: string
    id: string
  }
}

describe("POST /api/v1/auth/signup", () => {
  test("returns 201 and created user for valid payload", async () => {
    const payload = createDummyUserData()

    const res = await authRoutes.request("/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })

    const resBody = (await res.json()) as SignupResponse

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(resBody).toEqual({
      data: expect.objectContaining({
        email: payload.email.toLowerCase(),
        createdAt: expect.any(String),
        username: payload.username,
        id: expect.any(String),
        name: payload.name,
      }),
    })

    expect(resBody.data).not.toHaveProperty("password")
    expect(resBody.data).not.toHaveProperty("confirmPassword")

    expect(res.status).toBe(201)
  })
})
