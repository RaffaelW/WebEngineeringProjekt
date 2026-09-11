import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// find current directory
const dirname = path.dirname(fileURLToPath(import.meta.url));

// load root env
dotenv.config({ path: path.join(dirname, "..", ".env") });

export default defineConfig({
  // directory of schema.prisma relative to current directory
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    // directory of migrations folders
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
