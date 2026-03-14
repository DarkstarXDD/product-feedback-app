import { describe, expect, test } from "vitest"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/utils"

import {
  type SuggestionListItem,
  type Suggestion,
} from "@/lib/selects/suggestion.selects"

import { createSuggestionScenario } from "./utils"
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
