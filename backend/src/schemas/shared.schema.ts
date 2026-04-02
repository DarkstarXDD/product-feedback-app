import * as z from "zod"

import type { JsonErrorBody } from "@/lib/responses"

import { paginationResponseSchema } from "@/schemas/pagination.schema"
import { ERROR_CODES } from "@/lib/consts"

/** Describes the standard jsonError response body. */
export const jsonErrorSchema: z.ZodType<JsonErrorBody> = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  errors: z
    .object({
      fieldErrors: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .meta({
          example: {
            email: ["Invalid email"],
            password: ["Password must be at least 8 characters long"],
          },
        }),
      formErrors: z
        .array(z.string())
        .optional()
        .meta({
          example: ["Invalid email or password"],
        }),
    })
    .optional(),
})

/** Wraps a response payload schema in the standard jsonSuccess envelope. */
export function jsonSuccessSchema<TOutput, TInput = TOutput>(
  dataSchema: z.ZodType<TOutput, TInput>
) {
  return z.object({ data: dataSchema })
}

/** Wraps a response payload schema in the standard jsonSuccess envelope with a typed pagination meta. */
export function paginatedSuccessSchema<TOutput, TInput = TOutput>(
  dataSchema: z.ZodType<TOutput, TInput>
) {
  return z.object({
    data: dataSchema,
    meta: z.object({ pagination: paginationResponseSchema }),
  })
}
