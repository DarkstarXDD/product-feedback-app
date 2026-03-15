import { Hono } from "hono"

import { categorySelect } from "@/lib/selects/category.selects"
import { jsonSuccess } from "@/lib/utils"
import { prisma } from "@/db/client"

const categoryRoutes = new Hono()

// ------------------------------- GET All Categories --------------------------------
categoryRoutes.get("/", async (c) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: categorySelect,
  })

  return jsonSuccess(c, { data: categories }, { status: 200 })
})

export default categoryRoutes
