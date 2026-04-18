import * as z from "zod"

import { formatZodErrors } from "@/lib/utils"

const envSchema = z.object({
  JWT_SECRET: z.string("JWT Secret is not defined"),
  DATABASE_URL: z.url("Database URL is not defined"),
  DIRECT_URL: z.url("Direct database URL is not defined"),
  NODE_ENV: z.string().default("development"),
})

type Env = z.infer<typeof envSchema>

let env: Env

try {
  env = envSchema.parse(process.env)
} catch (e) {
  if (e instanceof z.ZodError) {
    const errors = formatZodErrors(e)
    console.log("Error loading environment variables!")
    console.log(errors.fieldErrors)
  } else {
    throw new Error("Error loading environment variables!")
  }
  process.exit(1)
}

export default env
