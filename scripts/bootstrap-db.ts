import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { required, updateLocalEnv } from "./env";

async function main() {
  const original = new URL(required("DATABASE_ADMIN_URL"));
  const projectRef = new URL(required("NEXT_PUBLIC_SUPABASE_URL")).hostname.split(".")[0];
  const candidates = [original];
  for (const shard of [1, 0]) {
    const url = new URL(original);
    url.hostname = `aws-${shard}-ap-southeast-1.pooler.supabase.com`;
    url.username = `postgres.${projectRef}`;
    candidates.push(url);
  }
  let admin: ReturnType<typeof postgres> | undefined;
  let connectedUrl: URL | undefined;
  for (const candidate of candidates) {
    const connection = postgres(candidate.toString(), { ssl: "require", max: 1, prepare: false, connect_timeout: 8 });
    try {
      await connection`select 1`;
      admin = connection; connectedUrl = candidate; break;
    } catch { await connection.end({ timeout: 1 }); }
  }
  if (!admin || !connectedUrl) throw new Error("Database connection failed. Check credentials and the project's Connect → session pooler URL.");
  try {
    const appPassword = process.env.PORTFOLIO_APP_PASSWORD || randomBytes(32).toString("hex");
    const migrationPassword = process.env.PORTFOLIO_MIGRATOR_PASSWORD || randomBytes(32).toString("hex");
    if (appPassword.length < 24 || migrationPassword.length < 24) throw new Error("Role passwords must be at least 24 characters");
    const appUrl = new URL(connectedUrl);
    const migrationUrl = new URL(connectedUrl);
    const pooler = connectedUrl.hostname.includes("pooler.supabase.com");
    appUrl.username = pooler ? `portfolio_app.${projectRef}` : "portfolio_app";
    appUrl.password = appPassword; appUrl.port = pooler ? "6543" : "5432";
    migrationUrl.username = pooler ? `portfolio_migrator.${projectRef}` : "portfolio_migrator";
    migrationUrl.password = migrationPassword;
    await updateLocalEnv({
      DATABASE_ADMIN_URL: connectedUrl.toString(), DATABASE_POOL_URL: appUrl.toString(), DATABASE_MIGRATION_URL: migrationUrl.toString(),
      PORTFOLIO_APP_PASSWORD: appPassword, PORTFOLIO_MIGRATOR_PASSWORD: migrationPassword,
      IP_HASH_SECRET: process.env.IP_HASH_SECRET || randomBytes(32).toString("hex"),
      CRON_SECRET: process.env.CRON_SECRET || randomBytes(32).toString("hex"),
    });
    await admin.begin(async tx => {
      await tx`SET LOCAL standard_conforming_strings = on`;
      for (const [role, password] of [["portfolio_app", appPassword], ["portfolio_migrator", migrationPassword]]) {
        const exists = await tx`select 1 from pg_roles where rolname = ${role}`;
        if (!exists.length) {
          await tx.unsafe(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${password.replaceAll("'", "''")}'`);
        }
      }
      await tx.unsafe("GRANT portfolio_migrator TO postgres; CREATE SCHEMA IF NOT EXISTS portfolio AUTHORIZATION portfolio_migrator; ALTER SCHEMA portfolio OWNER TO portfolio_migrator; REVOKE ALL ON SCHEMA portfolio FROM PUBLIC, anon, authenticated; GRANT USAGE ON SCHEMA portfolio TO portfolio_app; CREATE TABLE IF NOT EXISTS portfolio.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint); ALTER TABLE portfolio.__drizzle_migrations OWNER TO portfolio_migrator;");
    });
    console.log("Database roles and private schema configured; credentials saved only to ignored .env.local.");
  } finally { await admin.end(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Database bootstrap failed"); process.exitCode = 1; });
