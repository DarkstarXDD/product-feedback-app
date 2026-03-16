import { describe, expect, test } from "vitest"

import type {
  AdminUserListItem,
  PrivateUser,
  PublicUser,
} from "@/lib/selects/user.selects"
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

describe("GET /api/v1/users/:username", () => {
  test("returns 200 and public user fields when unauthenticated", async () => {
    const { userCleanup, user } = await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`)

      const resBody = (await res.json()) as JsonSuccessBody<PublicUser>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: user.username,
        name: user.name,
      })
      expect(resBody.data).not.toHaveProperty("email")
      expect(resBody.data).not.toHaveProperty("role")
      expect(resBody.data).not.toHaveProperty("_count")
      expect(resBody.data).not.toHaveProperty("createdAt")
      expect(resBody.data).not.toHaveProperty("updatedAt")
      expect(resBody.data).not.toHaveProperty("id")
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 200 and private user fields when authenticated user requests their own profile", async () => {
    const { userCleanup, token, user } = await createUserSession("USER")

    try {
      const res = await app.request(`/api/v1/users/${user.username}`, {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonSuccessBody<PrivateUser>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name,
        id: user.id,
      })
      expect(resBody.data).toHaveProperty("_count")
      expect(resBody.data).toHaveProperty("createdAt")
      expect(resBody.data).toHaveProperty("updatedAt")
    } finally {
      await userCleanup().catch(() => {})
    }
  })

  test("returns 200 and private user fields when authenticated admin requests another user's profile", async () => {
    const { userCleanup: adminCleanup, token } =
      await createUserSession("ADMIN")
    const { userCleanup: targetUserCleanup, user: targetUser } =
      await createDummyUser("USER")

    try {
      const res = await app.request(`/api/v1/users/${targetUser.username}`, {
        headers: { cookie: `token=${token}` },
      })

      const resBody = (await res.json()) as JsonSuccessBody<PrivateUser>

      expect(res.status).toBe(200)
      expect(resBody.data).toMatchObject({
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
        name: targetUser.name,
        id: targetUser.id,
      })
      expect(resBody.data).toHaveProperty("_count")
      expect(resBody.data).toHaveProperty("createdAt")
      expect(resBody.data).toHaveProperty("updatedAt")
    } finally {
      await targetUserCleanup().catch(() => {})
      await adminCleanup().catch(() => {})
    }
  })

  test("returns 404 when username does not exist", async () => {
    const res = await app.request("/api/v1/users/does-not-exist")

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(404)
    expect(resBody).toMatchObject({
      message: "User not found",
      code: "NOT_FOUND",
    })
  })
})
