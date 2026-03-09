import { describe, expect, test } from "vitest"

import type { JsonErrorBody } from "@/lib/utils"

import { createUserSession, createComment } from "./utils"
import app from "../main"

describe("GET /api/v1/comments", () => {
  test("return 401 when unauthorized", async () => {
    const res = await app.request("/api/v1/comments")

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(401)

    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })
  })

  test("return 401 when auth user", async () => {
    const { cleanup, token } = await createUserSession("USER")

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(res.status).toBe(403)

    expect(resBody).toMatchObject({
      message: "Forbidden",
      code: "FORBIDDEN",
    })

    await cleanup()
  })

  test("return 200 and comment list when admin", async () => {
    /** Create a comment in db */
    const { cleanup, token } = await createUserSession("ADMIN")

    const res = await app.request("/api/v1/comments", {
      headers: { cookie: `token=${token}` },
    })

    expect(res.status).toBe(200)

    await cleanup()
  })
})

describe("GET /api/v1/comments/:id", () => {
  test("return 200 and comment when public", async () => {
    const comment = await createComment()

    const res = await app.request(`/api/v1/comments/${comment.id}`)

    expect(res.status).toBe(200)
  })

  test("return 200 and comment when user", async () => {
    const { cleanup, token } = await createUserSession("USER")
    const comment = await createComment()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { cookie: `token=${token}` },
    })

    expect(res.status).toBe(200)

    await cleanup()
  })

  test("return 200 and comment when admin", async () => {
    const { cleanup, token } = await createUserSession("ADMIN")
    const comment = await createComment()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      headers: { cookie: `token=${token}` },
    })

    expect(res.status).toBe(200)

    await cleanup()
  })

  test("return 404 if comment not found", async () => {
    const id: string = "123"

    const res = await app.request(`/api/v1/comments/${id}`)

    const resBody = (await res.json()) as JsonErrorBody

    expect(resBody).toMatchObject({
      message: "Comment not found",
      code: "NOT_FOUND",
    })

    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/v1/comments/:id", () => {
  test("public can't update comments", async () => {
    const comment = await createComment()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Public user tries to update the comment",
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(resBody).toMatchObject({
      message: "Unauthorized",
      code: "UNAUTHORIZED",
    })

    expect(res.status).toBe(401)
  })

  test("user can't update another user's comment", async () => {
    const { cleanup, token } = await createUserSession("USER")
    const comment = await createComment()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Another user tries to update the comment",
      }),
      headers: { "content-type": "application/json", cookie: `token=${token}` },
      method: "PATCH",
    })

    const resBody = (await res.json()) as JsonErrorBody

    expect(resBody).toMatchObject({
      message: "Not allowed or foribidden",
      code: "NOT_FOUND",
    })

    expect(res.status).toBe(404)

    await cleanup()
  })

  test("admin can update anyones comment", async () => {
    const { cleanup, token } = await createUserSession("ADMIN")
    const comment = await createComment()

    const res = await app.request(`/api/v1/comments/${comment.id}`, {
      body: JSON.stringify({
        content: "Admin tries to update the comment",
      }),
      headers: { "content-type": "application/json", cookie: `token=${token}` },
      method: "PATCH",
    })

    expect(res.status).toBe(200)

    await cleanup()
  })

  // test("returns 400 and field errors when validation fails", async () => {
  //   const comment = await createComment()

  //   const res = await app.request(`/api/v1/comments/:${id}`, {
  //     body: JSON.stringify({ content: "" }),
  //     method: "POST",
  //   })

  //   // const resBody = (await res.json()) as JsonErrorBody

  //   expect(res.status).toBe(400)
  // })
})
