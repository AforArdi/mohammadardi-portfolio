import "server-only";

export function authConfigured() {
  const dbUrl = process.env.DATABASE_POOL_URL || process.env.POSTGRES_URL;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.OWNER_USER_ID && dbUrl && process.env.IP_HASH_SECRET);
}
export function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const ownerId = process.env.OWNER_USER_ID;
  if (!url || !key || !ownerId) throw new Error("Owner authentication is not configured.");
  return { url, key, ownerId };
}
