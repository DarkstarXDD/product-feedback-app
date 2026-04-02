import { beforeEach, describe, expect, test } from "vitest"

import {
  signUpResponseSchema,
  signInResponseSchema,
} from "@/schemas/auth.schema"
import { jsonSuccessSchema, jsonErrorSchema } from "@/schemas/shared.schema"
import { prisma } from "@/db/client"
import app from "@/app"

import { createUserData, createUser, cleanupDb } from "./utils"

beforeEach(cleanupDb)

//--------------------------- POST /api/v1/auth/signup -------------------------------------
describe("POST /api/v1/auth/signup", () => {
  test("returns 201 and created user", async () => {
    const payload = createUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify(payload),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = jsonSuccessSchema(signUpResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(201)
    expect(resBody.data).toMatchObject({
      name: payload.name,
      username: payload.username,
      email: payload.email.toLowerCase(),
    })
    expect(resBody.data).not.toHaveProperty("password")
    expect(resBody.data).not.toHaveProperty("confirmPassword")
  })

  // ---------------------------------------------------------
  test("returns 201 and persists created user in database", async () => {
    const payload = createUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify(payload),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })

    const dbUser = await prisma.user.findUnique({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
      where: { email: payload.email.toLowerCase() },
    })

    expect(res.status).toBe(201)
    expect(dbUser).toMatchObject({
      name: payload.name,
      username: payload.username,
      email: payload.email.toLowerCase(),
    })
  })

  // ---------------------------------------------------------
  test("returns 400 when missing required fields", async () => {
    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({}),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: {
          name: ["Invalid name"],
          username: ["Invalid username"],
          email: ["Invalid email"],
          password: ["Invalid password"],
          confirmPassword: ["Invalid confirm password"],
        },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 400 when confirm password mismatch", async () => {
    const payload = createUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({ ...payload, confirmPassword: "12345678" }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: { confirmPassword: ["Passwords don't match"] },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 400 when password is shorter than minimum", async () => {
    const payload = createUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({
        ...payload,
        password: "123456",
        confirmPassword: "123456",
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: {
          password: ["Password must be at least 8 characters long"],
        },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 400 when email format is invalid", async () => {
    const payload = createUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({
        ...payload,
        email: "invalidemailformat",
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: { email: ["Invalid email"] },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 409 when username already exists", async () => {
    const payload = createUserData()
    const duplicatePayload = createUserData()

    const firstRes = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify(payload),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })

    expect(firstRes.status).toBe(201)

    const duplicateRes = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({
        ...duplicatePayload,
        username: payload.username,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const duplicateResBody = jsonErrorSchema.parse(await duplicateRes.json())

    expect(duplicateRes.status).toBe(409)
    expect(duplicateResBody).toEqual({
      code: "CONFLICT",
      message: "Unique constraint violation",
      errors: {
        fieldErrors: {
          username: ["Username taken. Please pick a different username"],
        },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 409 when email already exists", async () => {
    const firstPayload = createUserData()
    const duplicatePayload = createUserData()

    const firstRes = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify(firstPayload),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })

    expect(firstRes.status).toBe(201)

    const duplicateRes = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify({
        ...duplicatePayload,
        email: firstPayload.email,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const duplicateResBody = jsonErrorSchema.parse(await duplicateRes.json())

    expect(duplicateRes.status).toBe(409)
    expect(duplicateResBody).toEqual({
      code: "CONFLICT",
      message: "Unique constraint violation",
      errors: {
        fieldErrors: {
          email: ["Email already exists"],
        },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 201 and sets auth cookie", async () => {
    const payload = createUserData()

    const res = await app.request("/api/v1/auth/signup", {
      body: JSON.stringify(payload),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const cookie = res.headers.get("set-cookie")

    expect(res.status).toBe(201)
    expect(cookie).toBeTruthy()
    expect(cookie).toContain("token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    expect(cookie).toContain("SameSite=Lax")
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("Max-Age=604800")
  })
})

//--------------------------- POST /api/v1/auth/signin -------------------------------------
describe("POST /api/v1/auth/signin", () => {
  test("returns 200 and sets auth cookie", async () => {
    const { userPassword, user } = await createUser("USER")

    const signinRes = await app.request("/api/v1/auth/signin", {
      body: JSON.stringify({
        email: user.email,
        password: userPassword,
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })

    const signinResBody = jsonSuccessSchema(signInResponseSchema).parse(
      await signinRes.json()
    )
    const cookie = signinRes.headers.get("set-cookie")

    expect(signinRes.status).toBe(200)
    expect(signinResBody.data).toMatchObject({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
    })
    expect(signinResBody.data).not.toHaveProperty("password")
    expect(cookie).toBeTruthy()
    expect(cookie).toContain("token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    expect(cookie).toContain("SameSite=Lax")
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("Max-Age=604800")
  })

  // ---------------------------------------------------------
  test("returns 401 when password is invalid", async () => {
    const { user } = await createUser("USER")

    const signinRes = await app.request("/api/v1/auth/signin", {
      body: JSON.stringify({
        email: user.email,
        password: "invalid-password",
      }),
      headers: new Headers({ "Content-Type": "application/json" }),
      method: "POST",
    })
    const signinResBody = jsonErrorSchema.parse(await signinRes.json())

    expect(signinRes.status).toBe(401)
    expect(signinResBody).toEqual({
      code: "UNAUTHORIZED",
      message: "Invalid email or password",
      errors: {
        formErrors: ["Invalid email or password"],
      },
    })
  })
})

//--------------------------- POST /api/v1/auth/signout -------------------------------------
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
