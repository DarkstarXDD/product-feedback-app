import { describe, expect, test } from "vitest"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/responses"
import type { Pagination } from "@/lib/pagination"

import {
  type SuggestionWithCommentsResponse,
  type SuggestionCreateResponse,
  type SuggestionResponse,
} from "@/lib/selects/suggestion.select"
import { type CommentResponse } from "@/lib/selects/comment.select"
import { type UpvoteResponse } from "@/lib/selects/upvote.select"
import { prisma } from "@/db/client"
import app from "@/app"

import {
  createSuggestionScenario,
  createCommentScenario,
  getRandomCategoryId,
  createUserSession,
  createSuggestion,
  createDummyUser,
  createUpvote,
} from "./utils"

describe("GET /api/v1/suggestions", () => {
  test("returns 200 and suggestion list when suggestions exist", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request("/api/v1/suggestions")

    const resBody = (await res.json()) as JsonSuccessBody<SuggestionResponse[]>

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
    expect(resBody.data[0]).toHaveProperty("viewerHasUpvoted")

    await suggestionScenarioCleanup()
  })

  test("returns pagination metadata with defaults", async () => {
    const { suggestionScenarioCleanup } = await createSuggestionScenario()

    try {
      const res = await app.request("/api/v1/suggestions")

      const resBody = (await res.json()) as {
        meta: { pagination: Pagination }
      } & JsonSuccessBody<SuggestionResponse[]>

      expect(res.status).toBe(200)
      expect(resBody).toHaveProperty("meta.pagination")
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
    }
  })

  test("returns correct pagination metadata when multiple pages exist", async () => {
    const { userCleanup, user } = await createDummyUser("USER")
    const suggestionCleanups: Array<() => Promise<void>> = []

    try {
      for (let i = 0; i < 20; i++) {
        const { suggestionCleanup } = await createSuggestion({
          ownerId: user.id,
        })
        suggestionCleanups.push(suggestionCleanup)
      }

      const res = await app.request("/api/v1/suggestions?page=2&pageSize=10")

      const resBody = (await res.json()) as JsonSuccessBody<
        SuggestionResponse[]
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

  test("returns 400 with field errors when pagination query params are invalid", async () => {
    const res = await app.request("/api/v1/suggestions?page=0&pageSize=abc")

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(400)
    expect(resBody).toMatchObject({
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })
    expect(resBody.errors?.fieldErrors).toHaveProperty("page")
    expect(resBody.errors?.fieldErrors).toHaveProperty("pageSize")
  })
})

describe("GET /api/v1/suggestions/:slug", () => {
  test("returns 200 and suggestion when slug exists", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`)

    const resBody =
      (await res.json()) as JsonSuccessBody<SuggestionWithCommentsResponse>

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("slug", suggestion.slug)
    expect(resBody.data).toHaveProperty("title", suggestion.title)
    expect(resBody.data).toHaveProperty("description", suggestion.description)
    expect(Array.isArray(resBody.data.comments)).toBe(true)
    expect(resBody.data).toHaveProperty("_count")
    expect(resBody.data).toHaveProperty("viewerHasUpvoted")

    await suggestionScenarioCleanup()
  })

  test("returns 404 with NOT_FOUND when slug does not exist", async () => {
    const slug = "does-not-exist"

    const res = await app.request(`/api/v1/suggestions/${slug}`)

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "Suggestion not found",
      code: "NOT_FOUND",
    })
  })
})

describe("POST /api/v1/suggestions", () => {
  test("returns 401 when unauthenticated", async () => {
    const categoryId = await getRandomCategoryId()

    const res = await app.request("/api/v1/suggestions", {
      body: JSON.stringify({
        description: "Public user tries to create a suggestion",
        title: "New feature idea",
        categoryId,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })
  })

  test("returns 201 when authenticated user creates a valid suggestion", async () => {
    const categoryId = await getRandomCategoryId()
    const { userCleanup, token } = await createUserSession("USER")

    const payload = {
      description: "Authenticated user creates a valid suggestion",
      title: "New product idea",
      categoryId,
    }

    const res = await app.request("/api/v1/suggestions", {
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      body: JSON.stringify(payload),
      method: "POST",
    })

    const resBody =
      (await res.json()) as JsonSuccessBody<SuggestionCreateResponse>

    expect(res.status).toBe(201)
    expect(resBody.data).toHaveProperty("title", payload.title)
    expect(resBody.data).toHaveProperty("description", payload.description)
    expect(resBody.data).toHaveProperty("slug")
    expect(resBody.data).toHaveProperty("category")
    expect(resBody.data).toHaveProperty("_count")

    await prisma.suggestion.delete({
      where: { id: resBody.data.id },
    })
    await userCleanup()
  })

  test("returns 400 with field errors when validation fails", async () => {
    const { userCleanup, token } = await createUserSession("USER")

    const res = await app.request("/api/v1/suggestions", {
      body: JSON.stringify({
        categoryId: "123",
        description: "",
        title: "",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "POST",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          description: ["Description cannot be empty"],
          categoryId: ["Please pick a valid category"],
          title: ["Title cannot be empty"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })

    await userCleanup()
  })
})

describe("PATCH /api/v1/suggestions/:slug", () => {
  test("returns 401 when unauthenticated", async () => {
    const categoryId = await getRandomCategoryId()
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify({
        description: "Public user tries to update a suggestion",
        title: "Updated feature idea",
        categoryId,
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

    await suggestionScenarioCleanup()
  })

  test("returns 200 when owner updates their own suggestion", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario(user.id)

    const payload = {
      description: "Owner updates their own suggestion",
      categoryId: suggestion.categoryId,
      title: "Updated by owner",
    }

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      body: JSON.stringify(payload),
      method: "PATCH",
    })

    const resBody =
      (await res.json()) as JsonSuccessBody<SuggestionCreateResponse>

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("title", payload.title)
    expect(resBody.data).toHaveProperty("description", payload.description)

    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 200 when admin updates any suggestion", async () => {
    const { userCleanup, token } = await createUserSession("ADMIN")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const payload = {
      description: "Admin updates another user's suggestion",
      categoryId: suggestion.categoryId,
      title: "Updated by admin",
    }

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      body: JSON.stringify(payload),
      method: "PATCH",
    })

    const resBody =
      (await res.json()) as JsonSuccessBody<SuggestionCreateResponse>

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("title", payload.title)
    expect(resBody.data).toHaveProperty("description", payload.description)

    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 404 when a user tries to update another user's suggestion", async () => {
    const { userCleanup, token } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const payload = {
      description: "Another user tries to update a suggestion",
      categoryId: suggestion.categoryId,
      title: "Updated by another user",
    }

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      body: JSON.stringify(payload),
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "Not found or forbidden",
      code: "NOT_FOUND",
    })

    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 400 with field errors when validation fails", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario(user.id)

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify({
        categoryId: "123",
        description: "",
        title: "",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      errors: {
        fieldErrors: {
          description: ["Description cannot be empty"],
          categoryId: ["Please pick a valid category"],
          title: ["Title cannot be empty"],
        },
        formErrors: [],
      },
      message: "Server validation fails",
      code: "VALIDATION_ERROR",
    })

    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 404 when slug does not exist", async () => {
    const categoryId = await getRandomCategoryId()
    const { userCleanup, token } = await createUserSession("USER")
    const slug = "does-not-exist"

    const res = await app.request(`/api/v1/suggestions/${slug}`, {
      body: JSON.stringify({
        description: "Authenticated user tries to update a missing suggestion",
        title: "Missing suggestion update",
        categoryId,
      }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "Not found or forbidden",
      code: "NOT_FOUND",
    })

    await userCleanup()
  })
})

describe("POST /api/v1/suggestions/:slug/comments", () => {
  test("returns 401 when unauthenticated", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`,
      {
        body: JSON.stringify({
          content: "Public user tries to create a comment",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    )

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })

    await suggestionScenarioCleanup()
  })

  test("returns 201 when authenticated user creates a valid comment on a suggestion", async () => {
    const { userCleanup, token } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const payload = {
      content: "Authenticated user creates a valid comment",
    }

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`,
      {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify(payload),
        method: "POST",
      }
    )

    const resBody = (await res.json()) as JsonSuccessBody<CommentResponse>

    expect(res.status).toBe(201)
    expect(resBody.data).toHaveProperty("content", payload.content)
    expect(resBody.data).toHaveProperty("id")
    expect(resBody.data).toHaveProperty("suggestion.slug", suggestion.slug)

    await prisma.comment.delete({
      where: { id: resBody.data.id },
    })
    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 400 with field errors when validation fails", async () => {
    const { userCleanup, token } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`,
      {
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        body: JSON.stringify({
          content: "",
        }),
        method: "POST",
      }
    )

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

    await suggestionScenarioCleanup()
    await userCleanup()
  })
})

describe("GET /api/v1/suggestions/:slug/comments", () => {
  test("returns 200 and comment list for that suggestion", async () => {
    const { commentScenarioCleanup, suggestion, comment } =
      await createCommentScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`
    )

    const resBody = (await res.json()) as JsonSuccessBody<CommentResponse[]>

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === comment.id)).toBe(true)

    await commentScenarioCleanup()
  })
})

// --------------------------- Upvotes tests -----------------------------
describe("POST /api/v1/suggestions/:slug/upvotes", () => {
  test("returns 401 when unauthenticated", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        method: "POST",
      }
    )

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })

    await suggestionScenarioCleanup()
  })

  test("returns 201 when authenticated user upvotes a suggestion", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: {
          cookie: `token=${token}`,
        },
        method: "POST",
      }
    )

    const resBody = (await res.json()) as JsonSuccessBody<UpvoteResponse>

    expect(res.status).toBe(201)
    expect(resBody.data).toHaveProperty("userId", user.id)
    expect(resBody.data).toHaveProperty("suggestionId", suggestion.id)
    expect(resBody.data).toHaveProperty("id")

    await prisma.upvote.delete({ where: { id: resBody.data.id } })
    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 409 when authenticated user upvotes the same suggestion twice", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const { upvoteCleanup } = await createUpvote({
      suggestionId: suggestion.id,
      ownerId: user.id,
    })

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: {
          cookie: `token=${token}`,
        },
        method: "POST",
      }
    )

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(409)
    expect(resBody).toMatchObject({
      message: "Suggestion already upvoted",
      code: "CONFLICT",
    })

    await upvoteCleanup()
    await suggestionScenarioCleanup()
    await userCleanup()
  })
})

describe("DELETE /api/v1/suggestions/:slug/upvotes", () => {
  test("returns 401 when unauthenticated", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        method: "DELETE",
      }
    )

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })

    await suggestionScenarioCleanup()
  })

  test("returns 204 when authenticated user removes their upvote", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    await createUpvote({
      suggestionId: suggestion.id,
      ownerId: user.id,
    })

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: {
          cookie: `token=${token}`,
        },
        method: "DELETE",
      }
    )

    expect(res.status).toBe(204)

    await suggestionScenarioCleanup()
    await userCleanup()
  })

  test("returns 404 when authenticated user tries to remove a missing upvote", async () => {
    const { userCleanup, token } = await createUserSession("USER")
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: {
          cookie: `token=${token}`,
        },
        method: "DELETE",
      }
    )

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "Upvote not found",
      code: "NOT_FOUND",
    })

    await suggestionScenarioCleanup()
    await userCleanup()
  })
})
