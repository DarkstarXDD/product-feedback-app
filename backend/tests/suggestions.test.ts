import { describe, expect, test } from "vitest"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/utils"

import {
  type SuggestionListItem,
  type SuggestionCreate,
  type Suggestion,
} from "@/lib/selects/suggestion.selects"
import { prisma } from "@/db/client"

import {
  createSuggestionScenario,
  getRandomCategoryId,
  createUserSession,
} from "./utils"
import app from "../main"

describe("GET /api/v1/suggestions", () => {
  test("returns 200 and suggestion list when suggestions exist", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request("/api/v1/suggestions")

    const resBody = (await res.json()) as JsonSuccessBody<SuggestionListItem[]>

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)

    await suggestionScenarioCleanup()
  })
})

describe("GET /api/v1/suggestions/:slug", () => {
  test("returns 200 and suggestion when slug exists", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request(`/api/v1/suggestions/${suggestion.slug}`)

    const resBody = (await res.json()) as JsonSuccessBody<Suggestion>

    expect(res.status).toBe(200)
    expect(resBody.data).toHaveProperty("id", suggestion.id)
    expect(resBody.data).toHaveProperty("slug", suggestion.slug)
    expect(resBody.data).toHaveProperty("title", suggestion.title)
    expect(resBody.data).toHaveProperty("description", suggestion.description)
    expect(Array.isArray(resBody.data.comments)).toBe(true)
    expect(resBody.data).toHaveProperty("_count")

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

    const resBody = (await res.json()) as JsonSuccessBody<SuggestionCreate>

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
