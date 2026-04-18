import * as z from "zod"

import { formatZodErrors } from "@/lib/utils"

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  JWT_SECRET: z.string("JWT Secret is not defined"),
  DATABASE_URL: z.url("Database URL is invalid or not defined"),
  DIRECT_URL: z.url("Direct URL is invalid or not defined"),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.log("Error loading environment variables!")
  console.log(formatZodErrors(parsed.error).fieldErrors)
  process.exit(1)
}

const env = parsed.data
export default env
