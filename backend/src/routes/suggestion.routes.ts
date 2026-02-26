import { Hono } from "hono"

import {
  suggestionCreateSelect,
  suggestionListSelect,
  suggestionSelect,
} from "@/lib/selects/suggestion.selects"
import {
  formatZodErrors,
  generateSlug,
  jsonSuccess,
  jsonError,
} from "@/lib/utils"
import { resolveAuthUser } from "@/middlewares/resolve-auth-user.middleware"
import { suggestionCreateSchema } from "@/schemas/suggestion.schema"
import { requireRole } from "@/middlewares/require-role.middleware"
import { getUserOrThrow } from "@/lib/context-helpers"
import { prisma } from "@/db/client"

const suggestionRoutes = new Hono()

// ------------------------------- GET All Suggestions --------------------------------
suggestionRoutes.get("/", async (c) => {
  const suggestions = await prisma.suggestion.findMany({
    select: suggestionListSelect,
  })

  return jsonSuccess(c, { data: suggestions }, { status: 200 })
})

// ------------------------------- GET a Suggestion --------------------------------
suggestionRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const suggestion = await prisma.suggestion.findUnique({
    select: suggestionSelect,
    where: { slug },
  })

  if (!suggestion) {
    return jsonError(
      c,
      { message: "Suggestion not found", code: "NOT_FOUND" },
      { status: 404 }
    )
  }

  return jsonSuccess(c, { data: suggestion }, { status: 200 })
})

// ------------------------------- Create a Suggestion --------------------------------
suggestionRoutes.post(
  "/",
  resolveAuthUser,
  requireRole("ADMIN", "USER"),
  async (c) => {
    const user = getUserOrThrow(c)
    const payload = (await c.req.json()) as unknown
    const parsed = suggestionCreateSchema.safeParse(payload)

    if (!parsed.success) {
      return jsonError(
        c,
        {
          errors: formatZodErrors(parsed.error),
          message: "Server validation fails",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        ...parsed.data,
        slug: generateSlug(parsed.data.title),
        userId: user.id,
      },
      select: suggestionCreateSelect,
    })

    return jsonSuccess(c, { data: suggestion }, { status: 201 })
  }
)

export default suggestionRoutes
