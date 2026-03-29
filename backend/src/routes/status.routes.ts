import { describeRoute, resolver } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import { statusResponseSchema } from "@/schemas/status.schema"
import { jsonSuccessSchema } from "@/schemas/shared.schema"
import { statusSelect } from "@/lib/selects/status.select"
import { jsonSuccess } from "@/lib/responses"
import { prisma } from "@/db/client"

const statusRoutes = new Hono()

// ------------------------------- GET All Statuses --------------------------------
statusRoutes.get(
  "/",
  describeRoute({
    tags: ["Statuses"],
    summary: "Get All Statuses",
    description: "Returns a list of all statuses.",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: resolver(jsonSuccessSchema(z.array(statusResponseSchema))),
          },
        },
        description: "Successfully retrieved statuses.",
      },
    },
  }),
  async (c) => {
    const statuses = await prisma.status.findMany({
      orderBy: { name: "asc" },
      select: statusSelect,
    })

    return jsonSuccess(c, { data: statuses }, { status: 200 })
  }
)

export default statusRoutes
