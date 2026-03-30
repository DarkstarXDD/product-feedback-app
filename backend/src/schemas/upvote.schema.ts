import * as z from "zod"

import type { UpvoteResponse } from "@/lib/selects/upvote.select"

// --------------------- Upvote Response Schema -----------------------
export const upvoteResponseSchema: z.ZodType<UpvoteResponse> = z.object({
  id: z.cuid().meta({
    pattern: undefined,
    example: "cmlubyi3l000094r6fw9v8djs",
    "x-order": 1,
  }),
  createdAt: z
    .iso.datetime()
    .meta({ example: "2026-01-01T00:00:00.000Z", "x-order": 2 }),
  userId: z.cuid().meta({
    pattern: undefined,
    example: "cmlubyi3l000094r6fw9v8djs",
    "x-order": 3,
  }),
  suggestionId: z.cuid().meta({
    pattern: undefined,
    example: "cmlubyi3l000094r6fw9v8djs",
    "x-order": 4,
  }),
})
