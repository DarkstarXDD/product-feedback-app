import { beforeEach, describe, expect, test } from "vitest"
import * as z from "zod"

import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/response.schema"
import {
  privateUserResponseSchema,
  publicUserResponseSchema,
} from "@/schemas/user.schema"
import { suggestionWithViewerUpvoteResponseSchema } from "@/schemas/suggestion.schema"
import { commentResponseSchema } from "@/schemas/comment.schema"
import app from "@/app"

import {
  createSuggestionScenario,
  createCommentScenario,
  createUserSession,
  createSuggestion,
  createComment,
  createUpvote,
  createUser,
  cleanupDb,
} from "./utils"

beforeEach(cleanupDb)

//--------------------------- GET /api/v1/users ----------------------------------------
describe("GET /api/v1/users", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/v1/users")
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

    const res = await app.request("/api/v1/users", {
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
  test("returns 200 and user list when admin", async () => {
    const { token } = await createUserSession("ADMIN")
    const { user: listedUser } = await createUser("USER")

    const res = await app.request("/api/v1/users", {
      headers: { cookie: `token=${token}` },
    })

    const resBody = paginatedSuccessSchema(
      z.array(privateUserResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === listedUser.id)).toBe(true)
    expect(resBody.meta.pagination).toEqual({
      page: 1,
      pageSize: 10,
      hasPreviousPage: false,
      hasNextPage: false,
      totalItems: 2,
      totalPages: 1,
    })
  })

  // ---------------------------------------------------------
  test("returns 200 and correct pagination metadata when multiple pages exist", async () => {
    const { token } = await createUserSession("ADMIN")

    for (let i = 0; i < 19; i++) {
      await createUser("USER")
    }

    const res = await app.request("/api/v1/users?page=2&pageSize=10", {
      headers: { cookie: `token=${token}` },
    })

    const resBody = paginatedSuccessSchema(
      z.array(privateUserResponseSchema)
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

//--------------------------- GET /api/v1/users/:username ------------------------------
describe("GET /api/v1/users/:username", () => {
  test("returns 200 and user with public fields when unauthenticated", async () => {
    const { user } = await createUser("USER")

    const res = await app.request(`/api/v1/users/${user.username}`)
    const resBody = jsonSuccessSchema(publicUserResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toMatchObject({
      name: user.name,
      username: user.username,
    })
    expect(resBody.data).not.toHaveProperty("id")
    expect(resBody.data).not.toHaveProperty("email")
  })

  // ---------------------------------------------------------
  test("returns 200 and user with private fields when user requests own profile", async () => {
    const { token, user } = await createUserSession("USER")

    const res = await app.request(`/api/v1/users/${user.username}`, {
      headers: { cookie: `token=${token}` },
    })
    const resBody = jsonSuccessSchema(privateUserResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toMatchObject({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    })
  })

  // ---------------------------------------------------------
  test("returns 200 and user with private fields when admin requests any profile", async () => {
    const { token } = await createUserSession("ADMIN")
    const { user: targetUser } = await createUser("USER")

    const res = await app.request(`/api/v1/users/${targetUser.username}`, {
      headers: { cookie: `token=${token}` },
    })
    const resBody = jsonSuccessSchema(privateUserResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toMatchObject({
      id: targetUser.id,
      name: targetUser.name,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
    })
  })

  // ---------------------------------------------------------
  test("returns 404 when username does not exist", async () => {
    const res = await app.request("/api/v1/users/does-not-exist")
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "User not found",
    })
  })
})

//--------------------------- PATCH /api/v1/users/:username ----------------------------
describe("PATCH /api/v1/users/:username", () => {
  test("returns 401 when unauthenticated", async () => {
    const { user } = await createUser("USER")

    const res = await app.request(`/api/v1/users/${user.username}`, {
      body: JSON.stringify({ name: "Updated name" }),
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
  test("returns 403 when user tries to update another user's profile", async () => {
    const { token } = await createUserSession("USER")
    const { user: targetUser } = await createUser("USER")

    const res = await app.request(`/api/v1/users/${targetUser.username}`, {
      body: JSON.stringify({ name: "Updated by another user" }),
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
  test("returns 200 and updated profile when user updates their own profile", async () => {
    const { token, user } = await createUserSession("USER")
    const payload = { name: "Updated self name" }

    const res = await app.request(`/api/v1/users/${user.username}`, {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })
    const resBody = jsonSuccessSchema(privateUserResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toMatchObject({
      id: user.id,
      name: payload.name,
      username: user.username,
      email: user.email,
      role: user.role,
    })
    expect(resBody.data).not.toHaveProperty("password")
  })

  // ---------------------------------------------------------
  test("returns 200 and updated profile when admin updates any profile", async () => {
    const { token } = await createUserSession("ADMIN")
    const { user: targetUser } = await createUser("USER")
    const payload = { name: "Updated by admin" }

    const res = await app.request(`/api/v1/users/${targetUser.username}`, {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonSuccessSchema(privateUserResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toMatchObject({
      id: targetUser.id,
      name: payload.name,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
    })
    expect(resBody.data).not.toHaveProperty("password")
  })

  // ---------------------------------------------------------
  test("returns 400 when payload is empty", async () => {
    const { token, user } = await createUserSession("USER")

    const res = await app.request(`/api/v1/users/${user.username}`, {
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      body: JSON.stringify({}),
      method: "PATCH",
    })

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        formErrors: ["At least one field is required"],
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 409 when email already exists", async () => {
    const { token, user } = await createUserSession("USER")
    const { user: conflictingUser } = await createUser("USER")

    const res = await app.request(`/api/v1/users/${user.username}`, {
      body: JSON.stringify({ email: conflictingUser.email }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(409)
    expect(resBody).toMatchObject({
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
  test("returns 409 when username already exists", async () => {
    const { token, user } = await createUserSession("USER")
    const { user: conflictingUser } = await createUser("USER")

    const res = await app.request(`/api/v1/users/${user.username}`, {
      body: JSON.stringify({ username: conflictingUser.username }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(409)
    expect(resBody).toMatchObject({
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
  test("returns 404 when username does not exist", async () => {
    const { token } = await createUserSession("USER")

    const res = await app.request("/api/v1/users/does-not-exist", {
      body: JSON.stringify({ name: "Updated name" }),
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
      message: "User not found",
    })
  })
})

//--------------------------- GET /api/v1/users/:username/suggestions ------------------
describe("GET /api/v1/users/:username/suggestions", () => {
  test("returns 200 and suggestion list", async () => {
    const { user } = await createUser("USER")
    const suggestion = await createSuggestionScenario(user.id)

    const res = await app.request(`/api/v1/users/${user.username}/suggestions`)
    const resBody = paginatedSuccessSchema(
      z.array(suggestionWithViewerUpvoteResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
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
    const { user } = await createUser("USER")

    for (let i = 0; i < 20; i++) {
      await createSuggestion(user.id)
    }

    const res = await app.request(
      `/api/v1/users/${user.username}/suggestions?page=2&pageSize=10`
    )
    const resBody = paginatedSuccessSchema(
      z.array(suggestionWithViewerUpvoteResponseSchema)
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

//--------------------------- GET /api/v1/users/:username/upvotes ----------------------
describe("GET /api/v1/users/:username/upvotes", () => {
  test("returns 200 and suggestion list", async () => {
    const { user } = await createUser("USER")
    const suggestion = await createSuggestionScenario()
    await createUpvote({ suggestionId: suggestion.id, ownerId: user.id })

    const res = await app.request(`/api/v1/users/${user.username}/upvotes`)
    const resBody = paginatedSuccessSchema(
      z.array(suggestionWithViewerUpvoteResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
    expect(resBody.data[0]).toMatchObject({ viewerHasUpvoted: false })
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
    const { user } = await createUser("USER")

    for (let i = 0; i < 20; i++) {
      const suggestion = await createSuggestionScenario()
      await createUpvote({ suggestionId: suggestion.id, ownerId: user.id })
    }

    const res = await app.request(
      `/api/v1/users/${user.username}/upvotes?page=2&pageSize=10`
    )
    const resBody = paginatedSuccessSchema(
      z.array(suggestionWithViewerUpvoteResponseSchema)
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

//--------------------------- GET /api/v1/users/:username/comments ---------------------
describe("GET /api/v1/users/:username/comments", () => {
  test("returns 200 and comment list", async () => {
    const { user } = await createUserSession("USER")
    const { comment } = await createCommentScenario(user.id)

    const res = await app.request(`/api/v1/users/${user.username}/comments`)
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

  // ---------------------------------------------------------
  test("returns 200 and correct pagination metadata when multiple pages exist", async () => {
    const { user } = await createUser("USER")

    for (let i = 0; i < 20; i++) {
      const suggestion = await createSuggestionScenario()
      await createComment({ suggestionId: suggestion.id, ownerId: user.id })
    }

    const res = await app.request(
      `/api/v1/users/${user.username}/comments?page=2&pageSize=10`
    )
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
