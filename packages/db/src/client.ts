import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dbEnv } from "./env.js";
import * as schema from "./schema/index.js";

const pool = new Pool({ connectionString: dbEnv.DATABASE_URL });

/**
 * Shared Drizzle ORM client — the single source of truth for the
 * PostgreSQL connection across the monorepo.
 */
export const db = drizzle(pool, { schema });

/** The type of the shared Drizzle client. */
export type Database = typeof db;
