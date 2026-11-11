import "dotenv/config";
import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let connectionString = process.env.DATABASE_URL || "";
// Strip sslmode so node-postgres doesn't override rejectUnauthorized: false
connectionString = connectionString.replace(/[?&]sslmode=[^&]+/, "");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});
