import { describe, expect, test } from "vitest"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/utils"

import { prisma } from "@/db/client"

import { createDummyUserData } from "./utils"
import app from "../main"

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

    expect(res.status).toBe(201)
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
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    expect(resBody.data).not.toHaveProperty("password")
    expect(resBody.data).not.toHaveProperty("confirmPassword")

    await prisma.user.delete({ where: { id: resBody.data.id } })
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

    await prisma.user.delete({ where: { id: firstUserId } })
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

    await prisma.user.delete({ where: { id: firstUserId } })
  })

  test("returns 201 and sets auth cookie with expected attributes when success", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })
    const resBody = (await res.json()) as JsonSuccessBody<SignupResponse>
    const cookie = res.headers.get("set-cookie")

    expect(res.status).toBe(201)
    expect(cookie).toBeTruthy()
    expect(cookie).toContain("token=")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    expect(cookie).toContain("SameSite=Lax")
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("Max-Age=604800")

    await prisma.user.delete({ where: { id: resBody.data.id } })
  })

  test("returns 201 and persists created user in database when success", async () => {
    const payload = createDummyUserData()

    const res = await app.request("/api/v1/auth/signup", {
      headers: new Headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
      method: "POST",
    })
    const resBody = (await res.json()) as JsonSuccessBody<SignupResponse>

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
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(dbUser).toEqual({
      email: payload.email.toLowerCase(),
      username: payload.username,
      id: expect.any(String),
      name: payload.name,
    })
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    await prisma.user.delete({ where: { id: resBody.data.id } })
  })
})
