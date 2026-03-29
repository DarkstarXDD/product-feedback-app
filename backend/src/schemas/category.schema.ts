import * as z from "zod"

import type { CategoryResponse } from "@/lib/selects/category.select"

// --------------------- Category Response Schema -----------------------
export const categoryResponseSchema: z.ZodType<CategoryResponse> = z.object({
  id: z.cuid().meta({
    pattern: undefined,
    example: "cmlasmow10005gkr6grqngpl0",
    "x-order": 1,
  }),
  slug: z.string().meta({ example: "ui", "x-order": 2 }),
  name: z.string().meta({ example: "UI", "x-order": 3 }),
})
