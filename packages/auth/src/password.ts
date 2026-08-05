import { hash, verify } from "@node-rs/argon2";
import type { Options } from "@node-rs/argon2";

/**
 * Argon2id parameters, following the Better Auth docs' recommended profile
 * (64 MiB memory, 3 iterations, 4 lanes). Tune memoryCost/timeCost together
 * if login latency becomes a problem on the deployment hardware.
 *
 * NOTE: @node-rs/argon2 is a native binding — fine for the NestJS backend,
 * but this package can no longer run on edge runtimes without native
 * module support.
 */
const ARGON2_OPTIONS: Options = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
  algorithm: 2, // Argon2id
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a password against a stored hash. Argon2 hashes are self-
 * describing (`$argon2id$v=19$m=...`), so verification reads the parameters
 * from the hash itself; ARGON2_OPTIONS only shapes newly created hashes.
 *
 * Hashes created before the Argon2 switch (Better Auth's scrypt default,
 * stored as `{salt}:{hex}`) are rejected — re-seed those accounts.
 */
export async function verifyPassword(data: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (!data.hash.startsWith("$argon2")) return false;
  return verify(data.hash, data.password);
}
