import "dotenv/config";
import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";

/**
 * TLS for the PostgreSQL connection is environment-driven, so the same build
 * runs unchanged against managed Postgres (Supabase/Neon/RDS: TLS + pooler)
 * and against a plain self-hosted PostgreSQL or Docker service (no TLS).
 *
 * Resolution order:
 *   1. DATABASE_SSL        - explicit switch. true/1/yes/on/require enables TLS,
 *                            false/0/no/off/disable disables it.
 *   2. sslmode=... in URL  - require/prefer/no-verify -> TLS without certificate
 *                            verification; verify-ca/verify-full -> TLS with
 *                            verification; disable/allow -> no TLS.
 *   3. managed host hint   - known managed providers imply TLS.
 *   4. default             - no TLS, which is what local / Docker PostgreSQL use.
 */
export type DatabaseSsl = false | { rejectUnauthorized: boolean };

const SSL_TRUTHY = new Set(["true", "1", "yes", "on", "require", "required"]);
const SSL_FALSY = new Set(["false", "0", "no", "off", "disable", "disabled"]);

const MANAGED_HOST_HINTS: readonly string[] = [
  "supabase.com",
  "supabase.co",
  "neon.tech",
  "render.com",
  "railway.app",
  "rds.amazonaws.com",
  "azure.com",
  "ondigitalocean.com",
  "timescale.com",
];

function parseUrl(connectionString: string): URL | null {
  try {
    return new URL(connectionString);
  } catch {
    return null;
  }
}

export function resolveDatabaseSsl(connectionString: string): DatabaseSsl {
  const explicit = (process.env.DATABASE_SSL ?? "").trim().toLowerCase();
  if (SSL_TRUTHY.has(explicit)) return { rejectUnauthorized: false };
  if (SSL_FALSY.has(explicit)) return false;

  const parsed = parseUrl(connectionString);

  const sslmode = (parsed?.searchParams.get("sslmode") ?? "").trim().toLowerCase();
  if (sslmode) {
    if (sslmode === "disable" || sslmode === "allow") return false;
    if (sslmode === "verify-ca" || sslmode === "verify-full") {
      return { rejectUnauthorized: true };
    }
    return { rejectUnauthorized: false };
  }

  const host = (parsed?.hostname ?? "").toLowerCase();
  if (host && MANAGED_HOST_HINTS.some((hint) => host.endsWith(hint))) {
    return { rejectUnauthorized: false };
  }

  return false;
}

const rawConnectionString = process.env.DATABASE_URL ?? "";

if (!rawConnectionString) {
  throw new Error(
    "DATABASE_URL is not set. Point it at your PostgreSQL instance, e.g. " +
      "postgresql://user:password@localhost:5432/retemali_db?schema=public",
  );
}

// node-postgres would otherwise let the sslmode parameter override the explicit
// `ssl` option below, so the parameter is stripped and TLS is decided above.
// Two passes so a first-position sslmode does not leave a dangling separator.
function stripSslMode(connectionString: string): string {
  return connectionString
    .replace(/([?&])sslmode=[^&]*&/gi, "$1")
    .replace(/[?&]sslmode=[^&]*$/gi, "");
}

const connectionString = stripSslMode(rawConnectionString);

const poolConfig: PoolConfig = {
  connectionString,
  ssl: resolveDatabaseSsl(rawConnectionString),
};

const pool = new Pool(poolConfig);

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});
