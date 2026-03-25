import * as z from "zod"

import type { JsonSuccessBody, JsonErrorBody } from "@/lib/utils"

import { ERROR_CODES } from "@/lib/consts"

/** Describes the standard jsonError response body. */
export const jsonErrorSchema: z.ZodType<JsonErrorBody> = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  errors: z
    .object({
      fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
      formErrors: z.array(z.string()).optional(),
    })
    .optional(),
})

/** Wraps a response payload schema in the standard jsonSuccess envelope. */
export function jsonSuccessSchema<TOutput, TInput = TOutput>(
  dataSchema: z.ZodType<TOutput, TInput>
): z.ZodType<JsonSuccessBody<TOutput>, JsonSuccessBody<TInput>> {
  return z.object({
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
  })
}
