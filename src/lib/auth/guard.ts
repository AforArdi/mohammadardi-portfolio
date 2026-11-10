import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminSessions } from "@/db/schema";
import { supabaseServer } from "./supabase-server";
import { authConfig } from "./config";
import { AuthorizationError, validOwnerClaims } from "./policy";

export async function ownerIdentity(requireMfa = true) {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (error || claimsError || !user || user.id !== authConfig().ownerId || !data?.claims || !validOwnerClaims(data.claims, user.id, requireMfa)) throw new AuthorizationError();
  if (requireMfa && !user.factors?.some(factor => factor.factor_type === "totp" && factor.status === "verified")) throw new AuthorizationError();
  return { userId: user.id, sessionId: data.claims.session_id as string, supabase };
}

export async function requireOwnerAdmin() {
  const identity = await ownerIdentity();
  const [record] = await getDb().select({ deadlineAt: adminSessions.deadlineAt }).from(adminSessions).where(and(
    eq(adminSessions.sessionId, identity.sessionId), eq(adminSessions.userId, identity.userId),
    eq(adminSessions.isRevoked, false), gt(adminSessions.deadlineAt, new Date()),
    sql`NOT EXISTS (SELECT 1 FROM portfolio.owner_security WHERE user_id = ${identity.userId}::uuid AND password_change_id IS NOT NULL)`,
  ));
  if (!record) throw new AuthorizationError();
  return { ...identity, deadlineAt: record.deadlineAt };
}
