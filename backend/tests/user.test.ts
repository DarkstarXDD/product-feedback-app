import { beforeEach, describe, expect, test } from "vitest"
import * as z from "zod"

import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/shared.schema"
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

//--------------------------------------------------------------------------------------
//--------------------------- GET /api/v1/users ----------------------------------------
//--------------------------------------------------------------------------------------
describe("GET /api/v1/users", () => {
  //----------------------- 401 when unauthenticated ---------------------------
  test("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/v1/users")
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  //----------------------- 403 when auth user ---------------------------
  test("returns 403 when authenticated user is not an admin", async () => {
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

  // ----------------------- 200 and user list when admin -------------------------------------
  test("returns 200 and user list when authenticated user is an admin", async () => {
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

  // ----------------------- 200 and correct pagination data -----------------------------------
  test("returns correct pagination metadata when multiple pages exist", async () => {
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

//--------------------------------------------------------------------------------------
//--------------------------- PATCH /api/v1/users/:username ----------------------------
//--------------------------------------------------------------------------------------
describe("PATCH /api/v1/users/:username", () => {
  // ----------------------- 401 when unauthenticated -----------------------------------
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

  // ----------------------- 403 when user tries to update other users profile --------------------------
  test("returns 403 when authenticated user tries to update another user's profile", async () => {
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

  // ----------------------- 200 when user updates their own profile --------------------------
  test("returns 200 when authenticated user updates their own profile", async () => {
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

  // ----------------------- 200 when admin updates any profile --------------------------
  test("returns 200 when admin updates another user's profile", async () => {
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

  // ----------------------- 400 and field errors when validation fails -------------------
  test("returns 400 with form errors when payload is empty", async () => {
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
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        formErrors: ["At least one field is required"],
        fieldErrors: {},
      },
    })
  })

  // ----------------------- 409 when email already exists ----------------------------
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
    expect(resBody).toEqual({
      code: "CONFLICT",
      message: "Unique constraint violation",
      errors: {
        formErrors: [],
        fieldErrors: {
          email: ["Email already exists"],
        },
      },
    })
  })

  // ----------------------- 409 when username already exists --------------------------
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
    expect(resBody).toEqual({
      code: "CONFLICT",
      message: "Unique constraint violation",
      errors: {
        formErrors: [],
        fieldErrors: {
          username: ["Username taken. Please pick a different username"],
        },
      },
    })
  })

  // ----------------------- 404 when username not found ------------------------------
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

//--------------------------------------------------------------------------------------
//--------------------------- GET /api/v1/users/:username ------------------------------
//--------------------------------------------------------------------------------------
describe("GET /api/v1/users/:username", () => {
  // ----------------------- 200 and public fields when public user --------------------------
  test("returns 200 and public user fields when unauthenticated", async () => {
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

  // ----------------------- 200 and private fields when auth user --------------------------
  test("returns 200 and private user fields when authenticated user requests their own profile", async () => {
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

  // ----------------------- 200 and private fields when admin --------------------------
  test("returns 200 and private user fields when admin requests another user's profile", async () => {
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

  // ----------------------- 404 and username not found ------------------------------
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

//--------------------------------------------------------------------------------------
//--------------------------- GET /api/v1/users/:username/suggestions ------------------
//--------------------------------------------------------------------------------------
describe("GET /api/v1/users/:username/suggestions", () => {
  // ----------------------- 200 and suggestion list ------------------------------
  test("returns 200 and suggestion list for that user", async () => {
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

  // ----------------------- 200 and pagination data ----------------------------------
  test("returns correct pagination metadata when multiple pages exist", async () => {
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

//--------------------------------------------------------------------------------------
//--------------------------- GET /api/v1/users/:username/upvotes ----------------------
//--------------------------------------------------------------------------------------
describe("GET /api/v1/users/:username/upvotes", () => {
  // ----------------------- 200 and suggestion list ----------------------------------
  test("returns 200 and suggestion list the user has upvoted", async () => {
    const { user } = await createUser("USER")
    const suggestion = await createSuggestionScenario()
    await createUpvote({ suggestionId: suggestion.id, ownerId: user.id })

    const res = await app.request(`/api/v1/users/${user.username}/upvotes`)
    const resBody = paginatedSuccessSchema(
      z.array(suggestionWithViewerUpvoteResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
    expect(resBody.data[0]).toHaveProperty("viewerHasUpvoted", false)
    expect(resBody.meta.pagination).toEqual({
      page: 1,
      pageSize: 10,
      hasPreviousPage: false,
      hasNextPage: false,
      totalItems: 1,
      totalPages: 1,
    })
  })

  // ----------------------- 200 and paginated data ----------------------------------
  test("returns correct pagination metadata when multiple pages exist", async () => {
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

//--------------------------------------------------------------------------------------
//--------------------------- GET /api/v1/users/:username/comments ---------------------
//--------------------------------------------------------------------------------------
describe("GET /api/v1/users/:username/comments", () => {
  // ----------------------- 200 and comment list ----------------------------------
  test("returns 200 and comment list for that user", async () => {
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

  // ----------------------- 200 and comments with paginated data ----------------------------------
  test("returns correct pagination metadata when multiple pages exist", async () => {
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
