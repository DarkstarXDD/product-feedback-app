import { describe, expect, test } from "vitest"
import { faker } from "@faker-js/faker"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/utils"

import { createCommentScenario, createUserSession } from "./utils"
import app from "../main"

describe("GET /api/v1/comments", () => {
  /** Only admins can access the full comment list  */
  test("return 401 when unauthorized", async () => {
    const res = await app.request("/api/v1/comments")

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })
  })

  /** Only admins can access the full comment list  */
  test("return 403 when auth user", async () => {
    const { userCleanup, token } = await createUserSession("USER")

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(403)
    expect(resBody).toMatchObject({
      message: "Forbidden",
      code: "FORBIDDEN",
    })

    await userCleanup()
  })

  /** Only admins can access the full comment list  */
  test("return 200 and comment list when admin", async () => {
    const { userCleanup, token } = await createUserSession("ADMIN")
    const { commentScenarioCleanup, comment } = await createCommentScenario()

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })

    const resBody = (await res.json()) as JsonSuccessBody<
      Record<string, unknown>
    >

    expect(res.status).toBe(200)
    expect(resBody.data[0]).toHaveProperty("id", comment.id)

    await userCleanup()
    await commentScenarioCleanup()
  })
})

describe("GET /api/v1/comments/:id", () => {
  /** Anyone can access individual comments if they know the commendId  */
  test("return 200 and comment when public", async () => {
    const { commentScenarioCleanup, comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`)

    const resBody = (await res.json()) as JsonSuccessBody<
      Record<string, unknown>
    >

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", comment.id)

    await commentScenarioCleanup()
  })

  test("return 404 if comment not found", async () => {
    const id: string = "123"

    const res = await app.request(`/api/v1/comments/${id}`)

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "Comment not found",
      code: "NOT_FOUND",
    })
  })
})

describe("PATCH /api/v1/comments/:id", () => {
  /** Public (non logged in users) can't update any comments  */
  test("public can't update comments", async () => {
    const { commentScenarioCleanup, comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Public user tries to update the comment",
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })

    await commentScenarioCleanup()
  })

  /** John can't update Janes comment and vice versa  */
  test("user can't update another user's comment", async () => {
    const { userCleanup, token } = await createUserSession("USER")
    const { commentScenarioCleanup, comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Another user tries to update the comment",
      }),
      headers: { "content-type": "application/json", cookie: `token=${token}` },
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "Not allowed or foribidden",
      code: "NOT_FOUND",
    })

    await userCleanup()
    await commentScenarioCleanup()
  })

  /** Admin can update any comment created by anyone  */
  test("admin can update anyones comment", async () => {
    const { userCleanup, token } = await createUserSession("ADMIN")
    const { commentScenarioCleanup, comment } = await createCommentScenario()

    const updatedComment = faker.lorem.sentence()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { "content-type": "application/json", cookie: `token=${token}` },
      body: JSON.stringify({
        content: updatedComment,
      }),
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonSuccessBody<
      Record<string, unknown>
    >

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", comment.id)
    expect(resBody.data).toHaveProperty("content", updatedComment)

    await userCleanup()
    await commentScenarioCleanup()
  })

  /** John can update any comment created by themselves  */
  test("user can update their own comment", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { commentScenarioCleanup, comment } = await createCommentScenario(
      user.id
    )

    const updatedComment = faker.lorem.sentence()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { "content-type": "application/json", cookie: `token=${token}` },
      body: JSON.stringify({
        content: updatedComment,
      }),
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonSuccessBody<
      Record<string, unknown>
    >

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", comment.id)
    expect(resBody.data).toHaveProperty("content", updatedComment)

    await commentScenarioCleanup()
    await userCleanup()
  })

  /** Comment cannot be empty */
  test("returns 400 and field errors when validation fails", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { commentScenarioCleanup, comment } = await createCommentScenario(
      user.id
    )

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { "content-type": "application/json", cookie: `token=${token}` },
      body: JSON.stringify({
        content: "",
      }),
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(400)

    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          content: ["Comment cannot be empty"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })

    await commentScenarioCleanup()
    await userCleanup()
  })
})
