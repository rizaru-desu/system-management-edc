import type { auth } from "./auth.js";

/** A full session record (session + user) as inferred from the auth instance. */
export type Session = typeof auth.$Infer.Session;

/** The authenticated user as inferred from the auth instance. */
export type User = Session["user"];
