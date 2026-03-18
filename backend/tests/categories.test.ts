import { describe, expect, test } from "vitest"

import type { JsonSuccessBody } from "@/lib/utils"

import { type Category } from "@/lib/selects/category.selects"
import app from "@/app"

describe("GET /api/v1/categories", () => {
  test("returns 200 and category list", async () => {
    const res = await app.request("/api/v1/categories")

    const resBody = (await res.json()) as JsonSuccessBody<Category[]>

    expect(res.status).toBe(200)
    expect(Array.isArray(resBody.data)).toBe(true)
    expect(resBody.data.length).toBeGreaterThan(0)
    expect(resBody.data[0]).toHaveProperty("id")
    expect(resBody.data[0]).toHaveProperty("name")
    expect(resBody.data[0]).toHaveProperty("slug")
  })
})
