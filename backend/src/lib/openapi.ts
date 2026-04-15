import { type ResponsesWithResolver, resolver } from "hono-openapi"
import * as z from "zod"

export function jsonResponse(
  schema: z.ZodType,
  description: string
): ResponsesWithResolver[string] {
  return {
    content: {
      "application/json": { schema: resolver(schema) },
    },
    description,
  }
}
