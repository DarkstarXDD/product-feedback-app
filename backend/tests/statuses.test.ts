import { describe, expect, test } from "vitest"

import type { JsonSuccessBody } from "@/lib/utils"

import { type Status } from "@/lib/selects/status.select"
import app from "@/app"

describe("GET /api/v1/statuses", () => {
  test("returns 200 and status list", async () => {
    const res = await app.request("/api/v1/statuses")

    const resBody = (await res.json()) as JsonSuccessBody<Status[]>

    expect(res.status).toBe(200)
    expect(Array.isArray(resBody.data)).toBe(true)
    expect(resBody.data.length).toBeGreaterThan(0)
    expect(resBody.data[0]).toHaveProperty("id")
    expect(resBody.data[0]).toHaveProperty("name")
    expect(resBody.data[0]).toHaveProperty("slug")
  })
})
