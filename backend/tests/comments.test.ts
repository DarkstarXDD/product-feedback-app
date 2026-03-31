import { beforeEach, describe, expect, test } from "vitest"
import { faker } from "@faker-js/faker"
import * as z from "zod"

import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/shared.schema"
import { commentResponseSchema } from "@/schemas/comment.schema"
import app from "@/app"

import {
  createSuggestionScenario,
  createCommentScenario,
  createUserSession,
  createComment,
  cleanupDb,
} from "./utils"

beforeEach(cleanupDb)

describe("GET /api/v1/comments", () => {
  //----------------------- 401  when public ---------------------------
  test("return 401 when unauthorized", async () => {
    const res = await app.request("/api/v1/comments")
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  //---------------------- 403 when auth user --------------------------
  test("return 403 when auth user", async () => {
    const { token } = await createUserSession("USER")

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(403)
    expect(resBody).toMatchObject({
      code: "FORBIDDEN",
      message: "Forbidden",
    })
  })

  //------------------- 200 and comment list when admin ------------------------
  test("return 200 and comment list when admin", async () => {
    const { token } = await createUserSession("ADMIN")
    const { comment } = await createCommentScenario()

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })
    const resBody = paginatedSuccessSchema(
      z.array(commentResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === comment.id)).toBe(true)
    expect(resBody.meta.pagination).toEqual({
      page: 1,
      pageSize: 10,
      hasPreviousPage: false,
      hasNextPage: false,
      totalItems: 1,
      totalPages: 1,
    })
  })

  //----------------------------- 200 and correct paginated data ----------------------------
  test("return 200 and correct pagination metadata when multiple pages exist", async () => {
    const { token, user } = await createUserSession("ADMIN")

    for (let i = 0; i < 20; i++) {
      const { suggestion } = await createSuggestionScenario()
      await createComment({ suggestionId: suggestion.id, ownerId: user.id })
    }

    const res = await app.request("/api/v1/comments?page=2&pageSize=10", {
      headers: { cookie: `token=${token}` },
    })
    const resBody = paginatedSuccessSchema(
      z.array(commentResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveLength(10)
    expect(resBody.meta.pagination).toEqual({
      page: 2,
      pageSize: 10,
      hasPreviousPage: true,
      hasNextPage: false,
      totalItems: 20,
      totalPages: 2,
    })
  })
})

describe("GET /api/v1/comments/:id", () => {
  //----------------------------- 200 and comment when public ----------------------------
  test("return 200 and comment when public", async () => {
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`)
    const resBody = jsonSuccessSchema(commentResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", comment.id)
  })

  //----------------------------- 404 when comment not found ----------------------------
  test("return 404 if comment not found", async () => {
    const res = await app.request(`/api/v1/comments/123`)
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Comment not found",
    })
  })
})

describe("PATCH /api/v1/comments/:id", () => {
  //----------------------------- 401 when public tries to update comment ----------------------------
  test("public can't update comments", async () => {
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Public user tries to update the comment",
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  //------------------------ 403 when user tries to update another user's comment -------------------
  test("user can't update another user's comment", async () => {
    const { token } = await createUserSession("USER")
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Another user tries to update the comment",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(403)
    expect(resBody).toMatchObject({
      code: "FORBIDDEN",
      message: "Not allowed or forbidden",
    })
  })

  //-------------------------- 200 when admin update any comment ---------------------
  test("admin can update anyones comment", async () => {
    const { token } = await createUserSession("ADMIN")
    const { comment } = await createCommentScenario()
    const updatedComment = faker.lorem.sentence()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({ content: updatedComment }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonSuccessSchema(commentResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", comment.id)
    expect(resBody.data).toHaveProperty("content", updatedComment)
  })

  //-------------------------- 200 when user updates their own comment ---------------------
  test("user can update their own comment", async () => {
    const { token, user } = await createUserSession("USER")
    const { comment } = await createCommentScenario(user.id)
    const updatedComment = faker.lorem.sentence()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({ content: updatedComment }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonSuccessSchema(commentResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", comment.id)
    expect(resBody.data).toHaveProperty("content", updatedComment)
  })

  //--------------------------- 404 when comment not found ---------------------------
  test("returns 404 when comment id does not exist", async () => {
    const { token } = await createUserSession("USER")

    const res = await app.request(`/api/v1/comments/does-not-exist`, {
      body: JSON.stringify({ content: "Trying to update a missing comment" }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Comment not found",
    })
  })

  //--------------------------- 400 when field validation fails ---------------------------
  test("returns 400 and field errors when validation fails", async () => {
    const { token, user } = await createUserSession("USER")
    const { comment } = await createCommentScenario(user.id)

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({ content: "" }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        formErrors: [],
        fieldErrors: {
          content: ["Comment cannot be empty"],
        },
      },
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
    })
  })
})
