import * as z from "zod"

import type { JsonSuccessBody } from "@/lib/utils"

/** Wraps a response payload schema in the standard jsonSuccess envelope. */
export function jsonSuccessSchema<TOutput, TInput = TOutput>(
  dataSchema: z.ZodType<TOutput, TInput>
): z.ZodType<JsonSuccessBody<TOutput>, JsonSuccessBody<TInput>> {
  return z.object({
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
  })
}
