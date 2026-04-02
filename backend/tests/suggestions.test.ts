import { beforeEach, describe, expect, test } from "vitest"
import * as z from "zod"

import {
  suggestionWithViewerUpvoteResponseSchema,
  suggestionWithCommentsResponseSchema,
  suggestionCreateResponseSchema,
} from "@/schemas/suggestion.schema"
import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/shared.schema"
import { commentResponseSchema } from "@/schemas/comment.schema"
import { upvoteResponseSchema } from "@/schemas/upvote.schema"
import app from "@/app"

import {
  createSuggestionScenario,
  createCommentScenario,
  getRandomCategoryId,
  createUserSession,
  createSuggestion,
  createUpvote,
  createUser,
  cleanupDb,
} from "./utils"

beforeEach(cleanupDb)

//--------------------------- GET /api/v1/suggestions ----------------------------------
describe("GET /api/v1/suggestions", () => {
  test("returns 200 and suggestion list", async () => {
    const suggestion = await createSuggestionScenario()

    const res = await app.request("/api/v1/suggestions")
    const resBody = paginatedSuccessSchema(
      z.array(suggestionWithViewerUpvoteResponseSchema)
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)
  })

  // ---------------------------------------------------------
  test("returns 200 and correct pagination metadata when multiple pages exist", async () => {
    const { user } = await createUser("USER")

    for (let i = 0; i < 20; i++) {
      await createSuggestion(user.id)
    }

    const res = await app.request("/api/v1/suggestions?page=2&pageSize=10")
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

  // ---------------------------------------------------------
  test("returns 400 when pagination query params are invalid", async () => {
    const res = await app.request("/api/v1/suggestions?page=0&pageSize=abc")
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
    })
    expect(resBody.errors?.fieldErrors).toHaveProperty("page")
    expect(resBody.errors?.fieldErrors).toHaveProperty("pageSize")
  })
})

//--------------------------- GET /api/v1/suggestions/:slug ----------------------------
describe("GET /api/v1/suggestions/:slug", () => {
  test("returns 200 and suggestion", async () => {
    const suggestion = await createSuggestionScenario()

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`)
    const resBody = jsonSuccessSchema(
      suggestionWithCommentsResponseSchema
    ).parse(await res.json())

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("slug", suggestion.slug)
    expect(resBody.data).toHaveProperty("title", suggestion.title)
    expect(resBody.data).toHaveProperty("description", suggestion.description)
  })

  // ---------------------------------------------------------
  test("returns 404 when suggestion does not exist", async () => {
    const res = await app.request(`/api/v1/suggestions/does-not-exist`)
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Suggestion not found",
    })
  })
})

//---------------------------- POST /api/v1/suggestions --------------------------------
describe("POST /api/v1/suggestions", () => {
  test("returns 401 when unauthenticated", async () => {
    const categoryId = await getRandomCategoryId()

    const res = await app.request("/api/v1/suggestions", {
      body: JSON.stringify({
        categoryId,
        title: "New feature idea",
        description: "Public user tries to create a suggestion",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  // ---------------------------------------------------------
  test("returns 201 and created suggestion when authenticated", async () => {
    const categoryId = await getRandomCategoryId()
    const { token } = await createUserSession("USER")

    const payload = {
      categoryId,
      title: "New product idea",
      description: "Authenticated user creates a valid suggestion",
    }

    const res = await app.request("/api/v1/suggestions", {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "POST",
    })

    const resBody = jsonSuccessSchema(suggestionCreateResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(201)
    expect(resBody.data).toHaveProperty("title", payload.title)
    expect(resBody.data).toHaveProperty("description", payload.description)
  })

  // ---------------------------------------------------------
  test("returns 400 when validation fails", async () => {
    const { token } = await createUserSession("USER")

    const res = await app.request("/api/v1/suggestions", {
      body: JSON.stringify({
        categoryId: "123",
        title: "",
        description: "",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "POST",
    })

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: {
          categoryId: ["Please pick a valid category"],
          title: ["Title cannot be empty"],
          description: ["Description cannot be empty"],
        },
      },
    })
  })
})

//---------------------------- PATCH /api/v1/suggestions/:slug -------------------------
describe("PATCH /api/v1/suggestions/:slug", () => {
  test("returns 401 when unauthenticated", async () => {
    const categoryId = await getRandomCategoryId()
    const suggestion = await createSuggestionScenario()

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify({
        categoryId,
        title: "Updated feature idea",
        description: "Public user tries to update a suggestion",
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
  test("returns 403 when user tries to update another user's suggestion", async () => {
    const { token } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()

    const payload = {
      categoryId: suggestion.categoryId,
      title: "Updated by another user",
      description: "Another user tries to update a suggestion",
    }

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify(payload),
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

  // ---------------------------------------------------------
  test("returns 200 and updated suggestion when user updates their own suggestion", async () => {
    const { token, user } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario(user.id)

    const payload = {
      categoryId: suggestion.categoryId,
      title: "Updated by owner",
      description: "Owner updates their own suggestion",
    }

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonSuccessSchema(suggestionCreateResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("title", payload.title)
    expect(resBody.data).toHaveProperty("description", payload.description)
  })

  // ---------------------------------------------------------
  test("returns 200 and updated suggestion when admin updates any suggestion", async () => {
    const { token } = await createUserSession("ADMIN")
    const suggestion = await createSuggestionScenario()

    const payload = {
      categoryId: suggestion.categoryId,
      title: "Updated by admin",
      description: "Admin updates another user's suggestion",
    }

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonSuccessSchema(suggestionCreateResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("title", payload.title)
    expect(resBody.data).toHaveProperty("description", payload.description)
  })

  // ---------------------------------------------------------
  test("returns 400 when validation fails", async () => {
    const { token, user } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario(user.id)

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`, {
      body: JSON.stringify({
        categoryId: "123",
        title: "",
        description: "",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `token=${token}`,
      },
      method: "PATCH",
    })

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: {
          description: ["Description cannot be empty"],
          categoryId: ["Please pick a valid category"],
          title: ["Title cannot be empty"],
        },
      },
    })
  })

  // ---------------------------------------------------------
  test("returns 404 when suggestion does not exist", async () => {
    const categoryId = await getRandomCategoryId()
    const { token } = await createUserSession("USER")

    const res = await app.request(`/api/v1/suggestions/does-not-exist`, {
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

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Suggestion not found",
    })
  })
})

//---------------------------- GET /api/v1/suggestions/:slug/comments ------------------
describe("GET /api/v1/suggestions/:slug/comments", () => {
  test("returns 200 and comment list", async () => {
    const { suggestion, comment } = await createCommentScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`
    )
    const resBody = jsonSuccessSchema(z.array(commentResponseSchema)).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === comment.id)).toBe(true)
  })
})

//---------------------------- POST /api/v1/suggestions/:slug/comments -----------------
describe("POST /api/v1/suggestions/:slug/comments", () => {
  test("returns 401 when unauthenticated", async () => {
    const suggestion = await createSuggestionScenario()

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

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  // ---------------------------------------------------------
  test("returns 201 and created comment when authenticated", async () => {
    const { token } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()

    const payload = {
      content: "Authenticated user creates a valid comment",
    }

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`,
      {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        method: "POST",
      }
    )

    const resBody = jsonSuccessSchema(commentResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(201)
    expect(resBody.data).toHaveProperty("content", payload.content)
    expect(resBody.data).toHaveProperty("suggestion.slug", suggestion.slug)
  })

  // ---------------------------------------------------------
  test("returns 400 when validation fails", async () => {
    const { token } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/comments`,
      {
        body: JSON.stringify({
          content: "",
        }),
        headers: {
          "content-type": "application/json",
          cookie: `token=${token}`,
        },
        method: "POST",
      }
    )

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(400)
    expect(resBody).toEqual({
      code: "VALIDATION_ERROR",
      message: "Server validation fails",
      errors: {
        fieldErrors: { content: ["Comment cannot be empty"] },
      },
    })
  })
})

//---------------------------- POST /api/v1/suggestions/:slug/upvotes ------------------
describe("POST /api/v1/suggestions/:slug/upvotes", () => {
  test("returns 401 when unauthenticated", async () => {
    const suggestion = await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      { method: "POST" }
    )
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  // ---------------------------------------------------------
  test("returns 201 and upvote when authenticated", async () => {
    const { token, user } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: { cookie: `token=${token}` },
        method: "POST",
      }
    )

    const resBody = jsonSuccessSchema(upvoteResponseSchema).parse(
      await res.json()
    )

    expect(res.status).toBe(201)
    expect(resBody.data).toHaveProperty("userId", user.id)
    expect(resBody.data).toHaveProperty("suggestionId", suggestion.id)
  })

  // ---------------------------------------------------------
  test("returns 409 when user upvotes the same suggestion twice", async () => {
    const { token, user } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()
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
        method: "POST",
      }
    )

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(409)
    expect(resBody).toMatchObject({
      code: "CONFLICT",
      message: "Suggestion already upvoted",
    })
  })
})

//---------------------------- DELETE /api/v1/suggestions/:slug/upvotes ----------------
describe("DELETE /api/v1/suggestions/:slug/upvotes", () => {
  test("returns 401 when unauthenticated", async () => {
    const suggestion = await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        method: "DELETE",
      }
    )
    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(401)
    expect(resBody).toMatchObject({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    })
  })

  // ---------------------------------------------------------
  test("returns 204 when user removes their upvote", async () => {
    const { token, user } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()

    await createUpvote({
      suggestionId: suggestion.id,
      ownerId: user.id,
    })

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: { cookie: `token=${token}` },
        method: "DELETE",
      }
    )

    expect(res.status).toBe(204)
  })

  // ---------------------------------------------------------
  test("returns 404 when upvote does not exist", async () => {
    const { token } = await createUserSession("USER")
    const suggestion = await createSuggestionScenario()

    const res = await app.request(
      `/api/v1/suggestions/${suggestion.slug}/upvotes`,
      {
        headers: { cookie: `token=${token}` },
        method: "DELETE",
      }
    )

    const resBody = jsonErrorSchema.parse(await res.json())

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      code: "NOT_FOUND",
      message: "Upvote not found",
    })
  })
})
