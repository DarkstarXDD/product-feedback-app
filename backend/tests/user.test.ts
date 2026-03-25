import { describe, expect, test } from "vitest"

import type {
  PrivateUserResponse,
  PublicUserResponse,
} from "@/lib/selects/user.selects"
import type { SuggestionListItemResponse } from "@/lib/selects/suggestion.selects"
import type { JsonSuccessBody, JsonErrorBody, Pagination } from "@/lib/utils"
import type { Comment } from "@/lib/selects/comments.select"

import app from "@/app"

import {
  createSuggestionScenario,
  createCommentScenario,
  createUserSession,
  createSuggestion,
  createDummyUser,
  createComment,
  createUpvote,
} from "./utils"

describe("GET /api/v1/users", () => {
  test("returns 401 when unauthenticated", async () => {
    const res = await app.request("/api/v1/users")

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })
  })

  test("returns 403 when authenticated user is not an admin", async () => {
    const { userCleanup, token } = await createUserSession("USER")

    try {
      const res = await app.request("/api/v1/users", {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(403)
      expect(resBody).toMatchObject({
        message: "Forbidden",
        code: "FORBIDDEN",
      })
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 200 and user list when authenticated user is an admin", async () => {
    const { userCleanup: adminCleanup, token } =
      await createUserSession("ADMIN")
    const { userCleanup: listedUserCleanup, user: listedUser } =
      await createDummyUser("USER")

    try {
      const res = await app.request("/api/v1/users", {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonSuccessBody<
        PrivateUserResponse[]
      > & {
        meta: { pagination: Pagination }
      }

      expect(res.status).toBe(200)
      expect(resBody.data.some((item) => item.id === listedUser.id)).toBe(true)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: false,
        hasNextPage: false,
        totalItems: 2,
        totalPages: 1,
        pageSize: 10,
        page: 1,
      })
    } finally {
      await listedUserCleanup().catch(() => {})
      await adminCleanup().catch(() => {})
    }
  })

  test("returns correct pagination metadata when multiple pages exist", async () => {
    const { userCleanup: adminCleanup, token } =
      await createUserSession("ADMIN")
    const userCleanups: Array<() => Promise<unknown>> = []

    try {
      for (let i = 0; i < 19; i++) {
        const { userCleanup } = await createDummyUser("USER")
        userCleanups.push(userCleanup)
      }

      const res = await app.request("/api/v1/users?page=2&pageSize=10", {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonSuccessBody<
        PrivateUserResponse[]
      > & {
        meta: { pagination: Pagination }
      }

      expect(res.status).toBe(200)
      expect(resBody.data).toHaveLength(10)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: true,
        hasNextPage: false,
        totalItems: 20,
        totalPages: 2,
        pageSize: 10,
        page: 2,
      })
    } finally {
      for (const cleanup of userCleanups.reverse()) {
        await cleanup().catch(() => {})
      }
      await adminCleanup().catch(() => {})
    }
  })
})

describe("PATCH /api/v1/users/:username", () => {
  test("returns 401 when unauthenticated", async () => {
    const { userCleanup, user } = await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Updated name" }),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(401)
      expect(resBody).toMatchObject({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      })
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 403 when authenticated user tries to update another user's profile", async () => {
    const { userCleanup: authUserCleanup, token } =
      await createUserSession("USER")
    const { userCleanup: targetUserCleanup, user: targetUser } =
      await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${targetUser.username}`, {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify({ name: "Updated by another user" }),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(403)
      expect(resBody).toMatchObject({
        message: "Forbidden",
        code: "FORBIDDEN",
      })
    } finally {
      await targetUserCleanup().catch(() => {})
      await authUserCleanup().catch(() => {})
    }
  })

  test("returns 200 when authenticated user updates their own profile", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const payload = { name: "Updated self name" }

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify(payload),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonSuccessBody<PrivateUserResponse>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: user.username,
        name: payload.name,
        email: user.email,
        role: user.role,
        id: user.id,
      })
      expect(resBody.data).toHaveProperty("_count")
      expect(resBody.data).toHaveProperty("createdAt")
      expect(resBody.data).toHaveProperty("updatedAt")
      expect(resBody.data).not.toHaveProperty("password")
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 200 when admin updates another user's profile", async () => {
    const { userCleanup: adminCleanup, token } =
      await createUserSession("ADMIN")
    const { userCleanup: targetUserCleanup, user: targetUser } =
      await createDummyUser("USER")
    const payload = { name: "Updated by admin" }

    try {
      const res = await app.request(`/api/v1/users/${targetUser.username}`, {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify(payload),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonSuccessBody<PrivateUserResponse>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        name: payload.name,
        id: targetUser.id,
      })
      expect(resBody.data).toHaveProperty("_count")
      expect(resBody.data).toHaveProperty("createdAt")
      expect(resBody.data).toHaveProperty("updatedAt")
      expect(resBody.data).not.toHaveProperty("password")
    } finally {
      await targetUserCleanup().catch(() => {})
      await adminCleanup().catch(() => {})
    }
  })

  test("returns 400 with form errors when payload is empty", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify({}),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(400)
      expect(resBody).toEqual({
        errors: {
          formErrors: ["At least one field is required"],
          fieldErrors: {},
        },
        message: "Server validation fails",
        code: "VALIDATION_ERROR",
      })
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 409 when email already exists", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { userCleanup: conflictingUserCleanup, user: conflictingUser } =
      await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify({ email: conflictingUser.email }),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(409)
      expect(resBody).toEqual({
        errors: {
          fieldErrors: {
            email: ["Email already exists"],
          },
        },
        message: "Unique constraint violation",
        code: "CONFLICT",
      })
    } finally {
      await conflictingUserCleanup().catch(() => {})
      await userCleanup().catch(() => {})
    }
  })

  test("returns 409 when username already exists", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { userCleanup: conflictingUserCleanup, user: conflictingUser } =
      await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify({ username: conflictingUser.username }),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(409)
      expect(resBody).toEqual({
        errors: {
          fieldErrors: {
            username: ["Username taken. Please pick a different username"],
          },
        },
        message: "Unique constraint violation",
        code: "CONFLICT",
      })
    } finally {
      await conflictingUserCleanup().catch(() => {})
      await userCleanup().catch(() => {})
    }
  })

  test("returns 404 when username does not exist", async () => {
    const { userCleanup, token } = await createUserSession("USER")

    try {
      const res = await app.request("/api/v1/users/does-not-exist", {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify({ name: "Updated name" }),
        method: "PATCH",
      })

      const resBody = (await res.json()) as JsonErrorBody

      expect(res.status).toBe(404)
      expect(resBody).toMatchObject({
        message: "User not found",
        code: "NOT_FOUND",
      })
    } finally {
      await userCleanup().catch(() => {})
    }
  })
})

describe("GET /api/v1/users/:username", () => {
  test("returns 200 and public user fields when unauthenticated", async () => {
    const { userCleanup, user } = await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`)

      const resBody = (await res.json()) as JsonSuccessBody<PublicUserResponse>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: user.username,
        name: user.name,
      })
      expect(resBody.data).not.toHaveProperty("email")
      expect(resBody.data).not.toHaveProperty("role")
      expect(resBody.data).not.toHaveProperty("_count")
      expect(resBody.data).not.toHaveProperty("createdAt")
      expect(resBody.data).not.toHaveProperty("updatedAt")
      expect(resBody.data).not.toHaveProperty("id")
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 200 and private user fields when authenticated user requests their own profile", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonSuccessBody<PrivateUserResponse>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        id: user.id,
      })
      expect(resBody.data).toHaveProperty("_count")
      expect(resBody.data).toHaveProperty("createdAt")
      expect(resBody.data).toHaveProperty("updatedAt")
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 200 and private user fields when authenticated admin requests another user's profile", async () => {
    const { userCleanup: adminCleanup, token } =
      await createUserSession("ADMIN")
    const { userCleanup: targetUserCleanup, user: targetUser } =
      await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${targetUser.username}`, {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonSuccessBody<PrivateUserResponse>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        name: targetUser.name,
        id: targetUser.id,
      })
      expect(resBody.data).toHaveProperty("_count")
      expect(resBody.data).toHaveProperty("createdAt")
      expect(resBody.data).toHaveProperty("updatedAt")
    } finally {
      await targetUserCleanup().catch(() => {})
      await adminCleanup().catch(() => {})
    }
  })

  test("returns 404 when username does not exist", async () => {
    const res = await app.request("/api/v1/users/does-not-exist")

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "User not found",
      code: "NOT_FOUND",
    })
  })
})

describe("GET /api/v1/users/:username/suggestions", () => {
  test("returns 200 and suggestion list for that user", async () => {
    const { userCleanup, user } = await createDummyUser("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario(user.id)

    try {
      const res = await app.request(
        `/api/v1/users/${user.username}/suggestions`
      )

      const resBody = (await res.json()) as JsonSuccessBody<
        SuggestionListItemResponse[]
      > & {
        meta: { pagination: Pagination }
      }

      expect(res.status).toBe(200)
      expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
      expect(resBody.data[0]).toHaveProperty("viewerHasUpvoted")
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: false,
        hasNextPage: false,
        totalItems: 1,
        totalPages: 1,
        pageSize: 10,
        page: 1,
      })
    } finally {
      await suggestionScenarioCleanup().catch(() => {})
      await userCleanup().catch(() => {})
    }
  })

  test("returns correct pagination metadata when multiple pages exist", async () => {
    const { userCleanup, user } = await createDummyUser("USER")
    const suggestionCleanups: Array<() => Promise<unknown>> = []

    try {
      for (let i = 0; i < 20; i++) {
        const { suggestionCleanup } = await createSuggestion({
          ownerId: user.id,
        })
        suggestionCleanups.push(suggestionCleanup)
      }

      const res = await app.request(
        `/api/v1/users/${user.username}/suggestions?page=2&pageSize=10`
      )

      const resBody = (await res.json()) as JsonSuccessBody<
        SuggestionListItemResponse[]
      > & {
        meta: { pagination: Pagination }
      }

      expect(res.status).toBe(200)
      expect(resBody.data).toHaveLength(10)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: true,
        hasNextPage: false,
        totalItems: 20,
        totalPages: 2,
        pageSize: 10,
        page: 2,
      })
    } finally {
      for (const cleanup of suggestionCleanups.reverse()) {
        await cleanup().catch(() => {})
      }
      await userCleanup().catch(() => {})
    }
  })
})

describe("GET /api/v1/users/:username/upvotes", () => {
  test("returns 200 and suggestion list the user has upvoted", async () => {
    const { userCleanup, user } = await createDummyUser("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()
    const { upvoteCleanup } = await createUpvote({
      suggestionId: suggestion.id,
      ownerId: user.id,
    })

    try {
      const res = await app.request(`/api/v1/users/${user.username}/upvotes`)

      const resBody = (await res.json()) as JsonSuccessBody<
        SuggestionListItemResponse[]
      > & {
        meta: { pagination: Pagination }
      }

      expect(res.status).toBe(200)
      expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
      expect(resBody.data[0]).toHaveProperty("viewerHasUpvoted", false)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: false,
        hasNextPage: false,
        totalItems: 1,
        totalPages: 1,
        pageSize: 10,
        page: 1,
      })
    } finally {
      await upvoteCleanup().catch(() => {})
      await suggestionScenarioCleanup().catch(() => {})
      await userCleanup().catch(() => {})
    }
  })

  test("returns correct pagination metadata when multiple pages exist", async () => {
    const { userCleanup, user } = await createDummyUser("USER")
    const suggestionScenarioCleanups: Array<() => Promise<unknown>> = []
    const upvoteCleanups: Array<() => Promise<unknown>> = []

    try {
      for (let i = 0; i < 20; i++) {
        const { suggestionScenarioCleanup, suggestion } =
          await createSuggestionScenario()
        suggestionScenarioCleanups.push(suggestionScenarioCleanup)

        const { upvoteCleanup } = await createUpvote({
          suggestionId: suggestion.id,
          ownerId: user.id,
        })
        upvoteCleanups.push(upvoteCleanup)
      }

      const res = await app.request(
        `/api/v1/users/${user.username}/upvotes?page=2&pageSize=10`
      )

      const resBody = (await res.json()) as JsonSuccessBody<
        SuggestionListItemResponse[]
      > & {
        meta: { pagination: Pagination }
      }

      expect(res.status).toBe(200)
      expect(resBody.data).toHaveLength(10)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: true,
        hasNextPage: false,
        totalItems: 20,
        totalPages: 2,
        pageSize: 10,
        page: 2,
      })
    } finally {
      for (const cleanup of upvoteCleanups.reverse()) {
        await cleanup().catch(() => {})
      }
      for (const cleanup of suggestionScenarioCleanups.reverse()) {
        await cleanup().catch(() => {})
      }
      await userCleanup().catch(() => {})
    }
  })
})

describe("GET /api/v1/users/:username/comments", () => {
  test("returns 200 and comment list for that user", async () => {
    const { userCleanup, user } = await createUserSession("USER")
    const { commentScenarioCleanup, comment } = await createCommentScenario(
      user.id
    )

    try {
      const res = await app.request(`/api/v1/users/${user.username}/comments`)

      const resBody = (await res.json()) as {
        meta: { pagination: Pagination }
      } & JsonSuccessBody<Comment[]>

      expect(res.status).toBe(200)
      expect(resBody.data.some((item) => item.id === comment.id)).toBe(true)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: false,
        hasNextPage: false,
        totalItems: 1,
        totalPages: 1,
        pageSize: 10,
        page: 1,
      })
    } finally {
      await commentScenarioCleanup().catch(() => {})
      await userCleanup().catch(() => {})
    }
  })

  test("returns correct pagination metadata when multiple pages exist", async () => {
    const { userCleanup, user } = await createDummyUser("USER")
    const suggestionScenarioCleanups: Array<() => Promise<unknown>> = []
    const commentCleanups: Array<() => Promise<unknown>> = []

    try {
      for (let i = 0; i < 20; i++) {
        const { suggestionScenarioCleanup, suggestion } =
          await createSuggestionScenario()
        suggestionScenarioCleanups.push(suggestionScenarioCleanup)

        const { commentCleanup } = await createComment({
          suggestionId: suggestion.id,
          ownerId: user.id,
        })
        commentCleanups.push(commentCleanup)
      }

      const res = await app.request(
        `/api/v1/users/${user.username}/comments?page=2&pageSize=10`
      )

      const resBody = (await res.json()) as {
        meta: { pagination: Pagination }
      } & JsonSuccessBody<Comment[]>

      expect(res.status).toBe(200)
      expect(resBody.data).toHaveLength(10)
      expect(resBody.meta.pagination).toEqual({
        hasPreviousPage: true,
        hasNextPage: false,
        totalItems: 20,
        totalPages: 2,
        pageSize: 10,
        page: 2,
      })
    } finally {
      for (const cleanup of commentCleanups.reverse()) {
        await cleanup().catch(() => {})
      }
      for (const cleanup of suggestionScenarioCleanups.reverse()) {
        await cleanup().catch(() => {})
      }
      await userCleanup().catch(() => {})
    }
  })
})
