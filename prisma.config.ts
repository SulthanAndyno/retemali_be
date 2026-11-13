import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Connection string used by the Prisma CLI (migrate deploy / migrate dev / seed).
 *
 * Resolution order:
 *   1. DIRECT_URL   - optional. On Supabase this is the session-mode pooler
 *                     (port 5432) or the direct host, the connection that is
 *                     safe for DDL. Keep it while prototyping against Supabase.
 *   2. DATABASE_URL - the single source of truth everywhere else. A standalone
 *                     PostgreSQL / Docker / VPS deployment needs only this one.
 *
 * Both the CLI and the runtime client therefore work off DATABASE_URL alone;
 * setting DIRECT_URL stays optional and only overrides the CLI connection.
 * Nothing here throws when a variable is missing, so `prisma generate` also
 * runs in a build stage that has no database credentials at all.
 */
const cliDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: cliDatabaseUrl,
  },
});
