import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load the root .env (same file docker-compose and prisma.config.ts use).
const dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dirname, "..", "..", "..", ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — check the root .env file");
}

// Prisma 7 connects through a driver adapter rather than a bundled engine.
const adapter = new PrismaPg({ connectionString });

/**
 * Shared PrismaClient instance for the whole backend.
 * Import this singleton everywhere instead of instantiating new clients,
 * so the app keeps a single connection pool.
 */
export const prisma = new PrismaClient({ adapter });
