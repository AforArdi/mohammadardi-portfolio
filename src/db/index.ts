import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let connection: ReturnType<typeof connect> | undefined;
function connect(url: string) {
  const client = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10, ssl: "require" });
  return drizzle(client, { schema });
}
export function getDb() {
  if (!process.env.DATABASE_POOL_URL) throw new Error("Database is not configured. Follow BACKEND_SETUP.md.");
  return connection ??= connect(process.env.DATABASE_POOL_URL);
}
