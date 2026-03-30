import { describe, expect, test } from "vitest"
import * as z from "zod"

import { statusResponseSchema } from "@/schemas/status.schema"
import { jsonSuccessSchema } from "@/schemas/shared.schema"
import app from "@/app"

describe("GET /api/v1/statuses", () => {
  test("returns 200 and status list", async () => {
    const res = await app.request("/api/v1/statuses")

    const resBody = jsonSuccessSchema(z.array(statusResponseSchema)).parse(
      await res.json()
    )

    expect(res.status).toBe(200)
    expect(resBody.data.length).toBeGreaterThan(0)
  })
})
