import { describe, expect, test } from "vitest"

import type { JsonSuccessBody } from "@/lib/utils"

import { type Suggestion } from "@/lib/selects/suggestion.selects"

import { createSuggestionScenario } from "./utils"
import app from "../main"

describe("GET /api/v1/suggestions", () => {
  test.only("returns 200 and suggestion list when suggestions exist", async () => {
    const { suggestionScenarioCleanup, suggestion } =
      await createSuggestionScenario()

    const res = await app.request("/api/v1/suggestions")

    const resBody = (await res.json()) as JsonSuccessBody<Suggestion[]>

    expect(res.status).toBe(200)
    expect(resBody.data.some((item) => item.id === suggestion.id)).toBe(true)

    await suggestionScenarioCleanup()
  })
})
