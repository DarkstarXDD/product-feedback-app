import { describeRoute, resolver } from "hono-openapi"
import { Hono } from "hono"

import {
  paginatedSuccessSchema,
  jsonSuccessSchema,
  jsonErrorSchema,
} from "@/schemas/shared.schema"
import {
  commentResponseSchema,
  commentUpdateSchema,
} from "@/schemas/comment.schema"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { requireRole } from "@/middlewares/require-role.middleware"
import { jsonSuccess, forbidden, notFound } from "@/lib/responses"
import { paginationSchema } from "@/schemas/pagination.schema"
import { commentSelect } from "@/lib/selects/comment.select"
import { zodValidator } from "@/middlewares/zod-validator"
import { getUserOrThrow } from "@/lib/context-helpers"
import { buildPagination } from "@/lib/pagination"
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
      200: {
        content: {
          "application/json": {
            schema: resolver(paginatedSuccessSchema(commentResponseSchema)),
          },
        },
        description: "Successfully retrieved comments.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Query parameters fail validation.",
      },
      401: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Unauthorized. User is not authenticated.",
      },
      403: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Forbidden. User does not have the required role.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN"),
  zodValidator("query", paginationSchema),
  async (c) => {
    const { pageSize, page } = c.req.valid("query")
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
        meta: { pagination: buildPagination({ page, pageSize, totalItems }) },
        data: comments,
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
      200: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(commentResponseSchema)),
          },
        },
        description: "Successfully retrieved comment.",
      },
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Comment does not exist.",
      },
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
      200: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(commentResponseSchema)),
          },
        },
        description: "Successfully updated comment.",
      },
      400: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Bad Request. Request body fails validation.",
      },
      401: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Unauthorized. User is not authenticated.",
      },
      403: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Forbidden. User does not own the comment.",
      },
      404: {
        content: {
          "application/json": {
            schema: resolver(jsonErrorSchema),
          },
        },
        description: "Not Found. Comment does not exist.",
      },
    },
  }),
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  zodValidator("json", commentUpdateSchema),
  async (c) => {
    const commentId = c.req.param("id")
    const { id, role } = getUserOrThrow(c)
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

export default commentsRouter
