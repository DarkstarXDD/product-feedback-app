import { compare, hash } from "bcryptjs"

/** Returns the hash for a plain string password
 * A wrapper around `hash` from `bcryptjs` with a fixed salt. */
export async function hashPassword(password: string) {
  return hash(password, 10)
}

/** Returns whether the password is valid.
 * A wrapper around `compare` from `bcryptjs`. */
export async function verifyPassword(
  plainStringPassword: string,
  hash: string
) {
  return compare(plainStringPassword, hash)
}
