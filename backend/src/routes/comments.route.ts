import { describeRoute } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import {
  jsonPaginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/response.schema"
import {
  commentResponseSchema,
  commentUpdateSchema,
} from "@/schemas/comment.schema"
import { jsonSuccess, forbidden, notFound } from "@/lib/responses"
import { resolveAuthUser } from "@/middleware/resolve-auth-user"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comment.select"
import { zodValidator } from "@/middleware/zod-validator"
import { requireRole } from "@/middleware/require-role"
import { buildPagination } from "@/lib/pagination"
import { jsonResponse } from "@/lib/openapi"
import { Prisma, prisma } from "@/db/client"

const commentsRouter = new Hono()

// ------------------------------- GET All Comments --------------------------------
commentsRouter.get(
  "/",
  describeRoute({
    tags: ["Comments"],
    summary: "Get All Comments",
    description: "Returns a paginated list of all comments. Admin only.",
    responses: {
      200: jsonResponse(
        jsonPaginatedSuccessSchema(z.array(commentResponseSchema)),
        "Successfully retrieved comments."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Query parameters fail validation."
      ),
      401: jsonResponse(
        jsonErrorSchema,
        "Unauthorized. User is not authenticated."
      ),
      403: jsonResponse(
        jsonErrorSchema,
        "Forbidden. User does not have the required role."
      ),
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN"),
  zodValidator("query", paginationSchema),
  async (c) => {
    const { page, pageSize } = c.req.valid("query")
    const skip = (page - 1) * pageSize

    const [totalItems, comments] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.findMany({
        select: commentSelect,
        take: pageSize,
        skip,
      }),
    ])

    return jsonSuccess(
      c,
      {
        data: comments,
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
      },
      { status: 200 }
    )
  }
)

// ------------------------------- GET a Comment --------------------------------
commentsRouter.get(
  "/:id",
  describeRoute({
    tags: ["Comments"],
    summary: "Get a Comment",
    description: "Returns a single comment by id.",
    responses: {
      200: jsonResponse(
        jsonSuccessSchema(commentResponseSchema),
        "Successfully retrieved comment."
      ),
      404: jsonResponse(jsonErrorSchema, "Not Found. Comment does not exist."),
    },
  }),
  async (c) => {
    const commentId = c.req.param("id")

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: commentSelect,
    })

    if (!comment) {
      return notFound(c, "Comment not found")
    }

    return jsonSuccess(c, { data: comment }, { status: 200 })
  }
)

// ------------------------------- Update a Comment --------------------------------
commentsRouter.patch(
  "/:id",
  describeRoute({
    tags: ["Comments"],
    summary: "Update a Comment",
    description: "Updates an existing comment by id.",
    responses: {
      200: jsonResponse(
        jsonSuccessSchema(commentResponseSchema),
        "Successfully updated comment."
      ),
      400: jsonResponse(
        jsonErrorSchema,
        "Bad Request. Request body fails validation."
      ),
      401: jsonResponse(
        jsonErrorSchema,
        "Unauthorized. User is not authenticated."
      ),
      403: jsonResponse(
        jsonErrorSchema,
        "Forbidden. User does not own the comment."
      ),
      404: jsonResponse(jsonErrorSchema, "Not Found. Comment does not exist."),
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", commentUpdateSchema),
  async (c) => {
    const commentId = c.req.param("id")
    const { id, role } = c.get("user")
    const parsedData = c.req.valid("json")

    const existing = await prisma.comment.findUnique({
      select: { id: true },
      where: { id: commentId },
    })

    if (!existing) {
      return notFound(c, "Comment not found")
    }

    try {
      const comment = await prisma.comment.update({
        data: { content: parsedData.content },
        select: commentSelect,
        where:
          role === "ADMIN" ? { id: commentId } : { userId: id, id: commentId },
      })

      return jsonSuccess(c, { data: comment }, { status: 200 })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return forbidden(c, "Not allowed or forbidden")
      }
      throw e
    }
  }
)

// ------------------------------- Delete a Comment --------------------------------
commentsRouter.delete(
  "/:id",
  describeRoute({
    tags: ["Comments"],
    summary: "Delete a Comment",
    description: "Deletes a comment by it's id.",
    responses: {
      204: { description: "Successfully deleted comment." },
      401: jsonResponse(
        jsonErrorSchema,
        "Unauthorized. User is not authenticated."
      ),
      403: jsonResponse(
        jsonErrorSchema,
        "Forbidden. User does not own the comment."
      ),
      404: jsonResponse(jsonErrorSchema, "Not Found. Comment does not exist."),
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const commentId = c.req.param("id")
    const { id, role } = c.get("user")

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    })

    if (!comment) {
      return notFound(c, "Comment not found")
    }

    try {
      await prisma.comment.delete({
        where:
          role === "ADMIN" ? { id: commentId } : { id: commentId, userId: id },
      })
      return c.body(null, 204)
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return forbidden(c, "Not allowed or forbidden")
      }
      throw e
    }
  }
)

export default commentsRouter
