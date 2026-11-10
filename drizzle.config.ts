import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
loadEnvConfig(process.cwd());
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_MIGRATION_URL || "postgresql://not-configured" },
  migrations: { schema: "portfolio", table: "__drizzle_migrations" },
  strict: true,
});
