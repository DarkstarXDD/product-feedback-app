import type { ValidationTargets } from "hono"

import { zValidator } from "@hono/zod-validator"
import * as z from "zod"

import { formatZodErrors, jsonError } from "@/lib/utils"

/** An abstraction on top of '@hono/zod-validator'.
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
  return zValidator(target, schema, (value, c) => {
    if (!value.success) {
      return jsonError(
        c,
        {
          errors: formatZodErrors(value.error),
          message: "Server validation fails",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }
  })
}
