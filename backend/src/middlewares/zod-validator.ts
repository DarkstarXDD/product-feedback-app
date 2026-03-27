import type { ValidationTargets } from "hono"

import { validator } from "hono-openapi"
import * as z from "zod"

import { formatZodErrors } from "@/lib/utils"
import { jsonError } from "@/lib/responses"

/** An abstraction on top of 'validator` from `hono-openapi'.
 * Accepts the `target` and a `schema`.
 * Grabs the value from the target on the incoming request and validates it using the schema.
 * If validation fails, returns a `jsonError`.
 * If validation passes, sets the valid data on the request context.
 * That data can be retreived using `c.req.valid(targetName)` inside other middleware or handlers.
 */
export function zodValidator<
  T extends z.ZodType,
  Target extends keyof ValidationTargets,
>(target: Target, schema: T) {
  return validator(target, schema, (value, c) => {
    if (!value.success) {
      return jsonError(
        c,
        {
          errors: formatZodErrors(
            new z.ZodError(value.error as z.core.$ZodIssue[])
          ),
          message: "Server validation fails",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }
  })
}

/**
 * `formatZodErrors expect a `z.ZodError` object.
 * But `validator` from `hono-openapi` only give the `issues[]` array of the zod error.
 * Not the entire `zodError` object.
 * Probably because thats the lowest common denominator shape that every validation library in the standard schema can conform to.
 * So we can't do this: `errors: formatZodErrors(value.error)`.
 * Instead we have to recreate a ZodError object using that errors array and pass it.
 */
