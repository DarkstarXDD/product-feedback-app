import { describeRoute } from "hono-openapi"
import { Hono } from "hono"
import * as z from "zod"

import { statusResponseSchema } from "@/schemas/status.schema"
import { jsonSuccessSchema } from "@/schemas/shared.schema"
import { statusSelect } from "@/lib/selects/status.select"
import { jsonSuccess } from "@/lib/responses"
import { jsonResponse } from "@/lib/openapi"
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
      200: jsonResponse(
        jsonSuccessSchema(z.array(statusResponseSchema)),
        "Successfully retrieved statuses."
      ),
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
