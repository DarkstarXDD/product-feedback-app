import { beforeEach, describe, expect, test } from "vitest"
import { faker } from "@faker-js/faker"
import * as z from "zod"

import {
  jsonPaginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/response.schema"
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

//--------------------------- GET /api/v1/comments -------------------------------------
describe("GET /api/v1/comments", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/v1/comments")
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  // ---------------------------------------------------------
  test("returns 403 when user is not an admin", async () => {
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

  // ---------------------------------------------------------
  test("returns 200 and comment list when admin", async () => {
    const { token } = await createUserSession("ADMIN")
    const { comment } = await createCommentScenario()

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })
    const resBody = jsonPaginatedSuccessSchema(
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

  // ---------------------------------------------------------
  test("returns 200 and correct pagination metadata when multiple pages exist", async () => {
    const { token, user } = await createUserSession("ADMIN")

    for (let i = 0; i < 20; i++) {
      const suggestion = await createSuggestionScenario()
      await createComment({ suggestionId: suggestion.id, ownerId: user.id })
    }

    const res = await app.request("/api/v1/comments?page=2&pageSize=10", {
      headers: { cookie: `token=${token}` },
    })
    const resBody = jsonPaginatedSuccessSchema(
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

//--------------------------- GET /api/v1/comments/:id ---------------------------------
describe("GET /api/v1/comments/:id", () => {
  test("returns 200 and comment", async () => {
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`)
    const resBody = jsonSuccessSchema(commentResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toMatchObject({ id: comment.id })
  })

  // ---------------------------------------------------------
  test("returns 404 when comment does not exist", async () => {
    const res = await app.request(`/api/v1/comments/123`)
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Comment not found",
    })
  })
})

//--------------------------- PATCH /api/v1/comments/:id ---------------------------------
describe("PATCH /api/v1/comments/:id", () => {
  test("returns 401 when unauthenticated", async () => {
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

  // ---------------------------------------------------------
  test("returns 403 when user tries to update another user's comment", async () => {
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
      message: "Forbidden",
    })
  })

  // ---------------------------------------------------------
  test("returns 200 and updated comment when user updates their own comment", async () => {
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
    expect(resBody.data).toMatchObject({
      id: comment.id,
      content: updatedComment,
    })
  })

  // ---------------------------------------------------------
  test("returns 200 and updated comment when admin updates any comment", async () => {
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
    expect(resBody.data).toMatchObject({
      id: comment.id,
      content: updatedComment,
    })
  })

  // ---------------------------------------------------------
  test("returns 400 when validation fails", async () => {
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
    expect(resBody).toMatchObject({
      errors: {
        fieldErrors: {
          content: ["Comment cannot be empty"],
        },
      },
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
    })
  })

  // ---------------------------------------------------------
  test("returns 404 when comment does not exist", async () => {
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
})

//--------------------------- DELETE /api/v1/comments/:id ---------------------------------
describe("DELETE /api/v1/comments/:id", () => {
  test("returns 401 when unauthenticated", async () => {
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      method: "DELETE",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  // ---------------------------------------------------------
  test("returns 403 when user tries to delete another user's comment", async () => {
    const { token } = await createUserSession("USER")
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { cookie: `token=${token}` },
      method: "DELETE",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(403)
    expect(resBody).toMatchObject({
      code: "FORBIDDEN",
      message: "Forbidden",
    })
  })

  // ---------------------------------------------------------
  test("returns 204 when user deletes their own comment", async () => {
    const { token, user } = await createUserSession("USER")
    const { comment } = await createCommentScenario(user.id)

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { cookie: `token=${token}` },
      method: "DELETE",
    })

    expect(res.status).toBe(204)
  })

  // ---------------------------------------------------------
  test("returns 204 when admin deletes any comment", async () => {
    const { token } = await createUserSession("ADMIN")
    const { comment } = await createCommentScenario()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { cookie: `token=${token}` },
      method: "DELETE",
    })

    expect(res.status).toBe(204)
  })

  // ---------------------------------------------------------
  test("returns 404 when comment does not exist", async () => {
    const { token } = await createUserSession("USER")

    const res = await app.request(`/api/v1/comments/does-not-exist`, {
      headers: { cookie: `token=${token}` },
      method: "DELETE",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Comment not found",
    })
  })
})
