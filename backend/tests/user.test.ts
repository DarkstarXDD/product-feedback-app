import { describe, expect, test } from "vitest"

import type { AdminUserListItem } from "@/lib/selects/user.selects"
import type { JsonSuccessBody, JsonErrorBody } from "@/lib/utils"

import { createUserSession, createDummyUser } from "./utils"
import app from "../main"

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

      const resBody = (await res.json()) as JsonSuccessBody<AdminUserListItem[]>

      expect(res.status).toBe(200)
      expect(resBody.data.some((item) => item.id === listedUser.id)).toBe(true)
    } finally {
      await listedUserCleanup().catch(() => {})
      await adminCleanup().catch(() => {})
    }
  })
})
