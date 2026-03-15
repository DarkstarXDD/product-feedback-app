import { Hono } from "hono"

import { statusSelect } from "@/lib/selects/status.selects"
import { jsonSuccess } from "@/lib/utils"
import { prisma } from "@/db/client"

const statusRoutes = new Hono()

// ------------------------------- GET All Statuses --------------------------------
statusRoutes.get("/", async (c) => {
  const statuses = await prisma.status.findMany({
    orderBy: { name: "asc" },
    select: statusSelect,
  })

  return jsonSuccess(c, { data: statuses }, { status: 200 })
})

export default statusRoutes
