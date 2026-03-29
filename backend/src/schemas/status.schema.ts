import * as z from "zod"

import type { StatusResponse } from "@/lib/selects/status.select"

// --------------------- Status Response Schema -----------------------
export const statusResponseSchema: z.ZodType<StatusResponse> = z.object({
  id: z.cuid().meta({
    pattern: undefined,
    example: "cmlasmovm0000gkr6p58nu72x",
    "x-order": 1,
  }),
  slug: z.string().meta({ example: "planned", "x-order": 2 }),
  name: z.string().meta({ example: "Planned", "x-order": 3 }),
})
