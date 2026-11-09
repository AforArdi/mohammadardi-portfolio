import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { freshLoginNonces } from "@/db/schema";
import { ownerIdentity } from "./guard";
import { AuthorizationError } from "./policy";

export async function freshLoginIdentity() {
  const identity = await ownerIdentity(false);
  const nonce = (await cookies()).get("portfolio_login_nonce")?.value;
  if (!nonce) throw new AuthorizationError("Sign in again to start a fresh verification.");
  const digest = createHash("sha256").update(nonce).digest("hex");
  const [record] = await getDb().select().from(freshLoginNonces).where(and(
    eq(freshLoginNonces.nonce, digest), eq(freshLoginNonces.userId, identity.userId), eq(freshLoginNonces.sessionId, identity.sessionId),
    isNull(freshLoginNonces.usedAt), gt(freshLoginNonces.expiresAt, new Date()),
  ));
  if (!record || record.failedAttempts >= 3) throw new AuthorizationError("Verification expired. Please sign in again.");
  return { ...identity, nonce: digest };
}
