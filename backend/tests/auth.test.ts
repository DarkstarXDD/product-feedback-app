import { describe, expect, test } from "vitest"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/responses"

import { prisma } from "@/db/client"
import app from "@/app"

import { createDummyUserData, createDummyUser } from "./utils"

type SignupResponse = {
  createdAt: string
  username: string
  email: string
  name: string
  id: string
}

describe("POST /api/v1/auth/signup", () => {
  test("returns 201 and created user when valid payload", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })
    const resBody = (await res.json()) as JsonSuccessBody<SignupResponse>

    try {
      expect(res.status).toBe(201)

      expect(resBody.data).toMatchObject({
        email: payload.email.toLowerCase(),
        username: payload.username,
        name: payload.name,
      })

      expect(resBody.data).not.toHaveProperty("password")
      expect(resBody.data).not.toHaveProperty("confirmPassword")
    } finally {
      await prisma.user.delete({ where: { id: resBody.data.id } }).catch(() => {})
    }
  })

  test("returns 400 and field errors when missing required fields", async () => {
    const res = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({}),
      method: "POST",
    })
    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          confirmPassword: ["Invalid confirm password"],
          password: ["Invalid password"],
          username: ["Invalid username"],
          email: ["Invalid email"],
          name: ["Invalid name"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })
  })

  test("returns 400 and field errors when confirm password mismatch", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({ ...payload, confirmPassword: "12345678" }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = await res.json()

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          confirmPassword: ["Passwords don't match"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })
  })

  test("returns 400 and field errors when password is shorter than minimum", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({
        ...payload,
        confirmPassword: "123456",
        password: "123456",
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = await res.json()

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          password: ["Password must be at least 8 characters long"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })
  })

  test("returns 400 and field errors when email format is invalid", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({
        ...payload,
        email: "invalidemailformat",
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = await res.json()

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          email: ["Invalid email"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })
  })

  test("returns 409 and field errors when email already exists", async () => {
    const firstPayload = createDummyUserData()

    const firstRes = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(firstPayload),
      method: "POST",
    })
    const firstResBody =
      (await firstRes.json()) as JsonSuccessBody<SignupResponse>
    const firstUserId = firstResBody.data.id

    try {
      expect(firstRes.status).toBe(201)

      const duplicatePayload = createDummyUserData()
      const duplicateRes = await app.request("/api/v1/auth/signup", {
        body: JSON.stringify({
          ...duplicatePayload,
          email: firstPayload.email,
        }),
        headers: new Headers({ "Content-Type": "application/json" }),
        method: "POST",
      })
      const duplicateResBody = (await duplicateRes.json()) as JsonErrorBody

      expect(duplicateRes.status).toBe(409)
      expect(duplicateResBody).toEqual({
        errors: {
          fieldErrors: {
            email: ["Email already exists"],
          },
        },
        message: "Unique constraint violation",
        code: "CONFLICT",
      })
    } finally {
      await prisma.user.delete({ where: { id: firstUserId } }).catch(() => {})
    }
  })

  test("returns 409 and field errors when username already exists", async () => {
    const payload = createDummyUserData()

    const firstRes = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })
    const firstResBody =
      (await firstRes.json()) as JsonSuccessBody<SignupResponse>
    const firstUserId = firstResBody.data.id

    try {
      expect(firstRes.status).toBe(201)

      const duplicatePayload = createDummyUserData()
      const duplicateRes = await app.request("/api/v1/auth/signup", {
        body: JSON.stringify({
          ...duplicatePayload,
          username: payload.username,
        }),
        headers: new Headers({ "Content-Type": "application/json" }),
        method: "POST",
      })
      const duplicateResBody = (await duplicateRes.json()) as JsonErrorBody

      expect(duplicateRes.status).toBe(409)
      expect(duplicateResBody).toEqual({
        errors: {
          fieldErrors: {
            username: ["Username taken. Please pick a different username"],
          },
        },
        message: "Unique constraint violation",
        code: "CONFLICT",
      })
    } finally {
      await prisma.user.delete({ where: { id: firstUserId } }).catch(() => {})
    }
  })

  test("returns 201 and sets auth cookie with expected attributes when success", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })
    const resBody = (await res.json()) as JsonSuccessBody<SignupResponse>

    try {
      const cookie = res.headers.get("set-cookie")

      expect(res.status).toBe(201)
      expect(cookie).toBeTruthy()
      expect(cookie).toContain("token=")
      expect(cookie).toContain("HttpOnly")
      expect(cookie).toContain("Secure")
      expect(cookie).toContain("SameSite=Lax")
      expect(cookie).toContain("Path=/")
      expect(cookie).toContain("Max-Age=604800")
    } finally {
      await prisma.user.delete({ where: { id: resBody.data.id } }).catch(() => {})
    }
  })

  test("returns 201 and persists created user in database when success", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })
    const resBody = (await res.json()) as JsonSuccessBody<SignupResponse>

    try {
      const dbUser = await prisma.user.findUnique({
        select: {
          username: true,
          email: true,
          name: true,
          id: true,
        },
        where: { email: payload.email.toLowerCase() },
      })

      expect(res.status).toBe(201)
      expect(dbUser).toMatchObject({
        email: payload.email.toLowerCase(),
        username: payload.username,
        name: payload.name,
      })
    } finally {
      await prisma.user.delete({ where: { id: resBody.data.id } }).catch(() => {})
    }
  })
})

// ------------------------------- Sign In --------------------------------
describe("POST /api/v1/auth/signin", () => {
  test("returns 200 and sets auth cookie when credentials are valid", async () => {
    const { userPassword, userCleanup, user } = await createDummyUser("USER")

    try {
      const signinRes = await app.request("/api/v1/auth/signin", {
        body: JSON.stringify({
          password: userPassword,
          email: user.email,
        }),
        headers: new Headers({ "Content-Type": "application/json" }),
        method: "POST",
      })

      const signinResBody =
        (await signinRes.json()) as JsonSuccessBody<SignupResponse>
      const cookie = signinRes.headers.get("set-cookie")

      expect(signinRes.status).toBe(200)
      expect(signinResBody.data).toMatchObject({
        username: user.username,
        email: user.email,
        name: user.name,
        id: user.id,
      })
      expect(signinResBody.data).not.toHaveProperty("password")
      expect(cookie).toBeTruthy()
      expect(cookie).toContain("token=")
      expect(cookie).toContain("HttpOnly")
      expect(cookie).toContain("Secure")
      expect(cookie).toContain("SameSite=Lax")
      expect(cookie).toContain("Path=/")
      expect(cookie).toContain("Max-Age=604800")
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 401 and form errors when password is invalid", async () => {
    const { userCleanup, user } = await createDummyUser("USER")

    try {
      const signinRes = await app.request("/api/v1/auth/signin", {
        body: JSON.stringify({
          password: "invalid-password",
          email: user.email,
        }),
        headers: new Headers({ "Content-Type": "application/json" }),
        method: "POST",
      })

      const signinResBody = (await signinRes.json()) as JsonErrorBody

      expect(signinRes.status).toBe(401)
      expect(signinResBody).toEqual({
        errors: {
          formErrors: ["Invalid email or password"],
        },
        message: "Invalid email or password",
        code: "UNAUTHORIZED",
      })
    } finally {
      await userCleanup().catch(() => {})
    }
  })
})

// ------------------------------- Sign Out --------------------------------
describe("POST /api/v1/auth/signout", () => {
  test("returns 204 and clears auth cookie", async () => {
    const res = await app.request("/api/v1/auth/signout", {
      method: "POST",
    })

    const cookie = res.headers.get("set-cookie")

    expect(res.status).toBe(204)
    expect(cookie).toBeTruthy()
    expect(cookie).toContain("token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    expect(cookie).toContain("Path=/")
    expect(cookie ?? "").toMatch(/(?:Max-Age=0|Expires=)/)
  })
})
