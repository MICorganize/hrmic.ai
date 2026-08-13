import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Direct connection used by the Prisma CLI (migrations, db push, studio).
    // Falls back gracefully so `prisma generate` works before .env is configured.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://user:password@localhost:5432/hrmic",
  },
});
