import { describe, expect, test } from "vitest"
import * as z from "zod"

import { categoryResponseSchema } from "@/schemas/category.schema"
import { jsonSuccessSchema } from "@/schemas/response.schema"
import app from "@/app"

describe("GET /api/v1/categories", () => {
  test("returns 200 and category list", async () => {
    const res = await app.request("/api/v1/categories")

    const resBody = jsonSuccessSchema(z.array(categoryResponseSchema)).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data.length).toBeGreaterThan(0)
  })
})
