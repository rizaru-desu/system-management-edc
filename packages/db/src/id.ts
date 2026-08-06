import { createId as createCuid } from "@paralleldrive/cuid2";

/**
 * The one ID generator for every custom application table (schema
 * `$defaultFn`s, and any service that ever needs to mint an ID up front).
 * CUID matches the Better Auth convention — its ids are opaque strings, so
 * the `text` foreign keys referencing `user.id` are unaffected — and unlike
 * UUIDs, cuid2 values are collision-resistant, URL-safe and non-guessable
 * by design. Do not reintroduce crypto.randomUUID()/uuid anywhere.
 */
export function createId(): string {
  return createCuid();
}
