import { describeRoute, resolver } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import { categoryResponseSchema } from "@/schemas/category.schema"
import { categorySelect } from "@/lib/selects/category.select"
import { jsonSuccessSchema } from "@/schemas/shared.schema"
import { jsonSuccess } from "@/lib/responses"
import { prisma } from "@/db/client"

const categoryRoutes = new Hono()

// ------------------------------- GET All Categories --------------------------------
categoryRoutes.get(
  "/",
  describeRoute({
    tags: ["Categories"],
    summary: "Get All Categories",
    description: "Returns a list of all categories.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(
              jsonSuccessSchema(z.array(categoryResponseSchema))
            ),
          },
        },
        description: "Successfully retrieved categories.",
      },
    },
  }),
  async (c) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: categorySelect,
    })

    return jsonSuccess(c, { data: categories }, { status: 200 })
  }
)

export default categoryRoutes
