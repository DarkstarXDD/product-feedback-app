import { Hono } from "hono"

import { suggestionListSelect } from "@/lib/selects/suggestion.selects"
import { jsonSuccess } from "@/lib/utils"
import { prisma } from "@/db/client"

const suggestionRoutes = new Hono()

// ------------------------------- GET All Suggestions --------------------------------
suggestionRoutes.get("/", async (c) => {
  const suggestions = await prisma.suggestion.findMany({
    select: suggestionListSelect,
  })

  return jsonSuccess(c, { data: suggestions }, { status: 200 })
})

export default suggestionRoutes
