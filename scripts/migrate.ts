import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { required } from "./env";

const client = postgres(required("DATABASE_MIGRATION_URL"), { ssl: "require", max: 1, prepare: false });
try {
  // Use Drizzle's generated SQL, hashes and journal, without its unconditional
  // CREATE SCHEMA statement (which requires database-wide CREATE privileges).
  const migrations = readMigrationFiles({ migrationsFolder: "src/db/migrations" });
  await client.begin(async tx => {
    await tx`select pg_advisory_xact_lock(hashtext('portfolio migrations'))`;
    const applied = await tx<{ hash: string; created_at: string }[]>`select hash, created_at from portfolio.__drizzle_migrations order by created_at`;
    for (const migration of migrations) {
      const existing = applied.find(row => Number(row.created_at) === migration.folderMillis);
      if (existing) { if (existing.hash !== migration.hash) throw new Error("An applied migration was changed. Restore its original contents."); continue; }
      if (applied.some(row => Number(row.created_at) > migration.folderMillis)) throw new Error("Migration history is out of order.");
      for (const statement of migration.sql) await tx.unsafe(statement);
      await tx`insert into portfolio.__drizzle_migrations (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`;
    }
  });
  console.log("Portfolio migrations applied.");
} catch (error) {
  let message = error instanceof Error ? error.message : "Migration failed";
  for (const key of ["DATABASE_MIGRATION_URL", "PORTFOLIO_MIGRATOR_PASSWORD", "SUPABASE_SECRET_KEY"]) {
    if (process.env[key]) message = message.replaceAll(process.env[key]!, "[redacted]");
  }
  console.error(message); process.exitCode = 1;
}
finally { await client.end(); }
