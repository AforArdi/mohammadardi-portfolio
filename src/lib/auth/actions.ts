"use server";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminSessions, freshLoginNonces } from "@/db/schema";
import { authConfigured, authConfig } from "./config";
import { supabaseServer } from "./supabase-server";
import { ownerIdentity } from "./guard";
import { establishAdminSession, reserveMfaAttempt, reserveRateLimit } from "./queries";
import { AuthorizationError } from "./policy";
import { freshLoginIdentity } from "./fresh-login";

const nonceName = "portfolio_login_nonce";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export type AuthState = { error?: string };

export async function login(_previous: AuthState, form: FormData): Promise<AuthState> {
  if (!authConfigured()) return { error: "Owner login is not connected yet." };
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || email.length > 254 || !password || password.length > 256) return { error: "Enter your email and password." };
  try {
    const requestHeaders = await headers();
    const address = process.env.VERCEL ? (requestHeaders.get("x-vercel-forwarded-for") || "unknown").split(",")[0].trim() : "local";
    const digest = (value: string) => createHmac("sha256", process.env.IP_HASH_SECRET!).update(value).digest("hex");
    const ip = await getDb().execute(reserveRateLimit(`login-ip:${digest(address)}`, 10, 900));
    const account = await getDb().execute(reserveRateLimit(`login-account:${digest(email)}`, 15, 900));
    if (!ip.length || !account.length) return { error: "Too many sign-in attempts. Please wait 15 minutes." };
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || data.user?.id !== authConfig().ownerId) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "Email or password is incorrect." };
    }
    const identity = await ownerIdentity(false);
    const nonce = randomBytes(32).toString("hex");
    await getDb().insert(freshLoginNonces).values({ nonce: hash(nonce), userId: identity.userId, sessionId: identity.sessionId, expiresAt: new Date(Date.now() + 300_000) });
    (await cookies()).set(nonceName, nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
  } catch { return { error: "Sign-in is unavailable right now. Please try again." }; }
  redirect("/admin/mfa");
}

export async function beginEnrollment(): Promise<{ error?: string; qr?: string; factorId?: string; secret?: string }> {
  try {
    const { supabase } = await freshLoginIdentity();
    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) return { error: "Could not load your authenticators." };
    if (factors.data.totp.some(f => f.status === "verified")) return { error: "Use an existing authenticator to finish this login." };
    for (const factor of factors.data.all.filter(f => f.status === "unverified")) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Portfolio owner", issuer: "Ardi Portfolio" });
    if (error) return { error: "Authenticator setup could not start. Please sign in again." };
    return { qr: data.totp.qr_code, factorId: data.id, secret: data.totp.secret };
  } catch { return { error: "Your fresh login expired. Please sign in again." }; }
}

export async function verifyMfa(_previous: AuthState, form: FormData): Promise<AuthState> {
  const code = String(form.get("code") || "").trim();
  const factorId = String(form.get("factorId") || "");
  if (!/^\d{6}$/.test(code) || !/^[0-9a-f-]{36}$/i.test(factorId)) return { error: "Enter the six-digit code from your authenticator." };
  try {
    const identity = await freshLoginIdentity();
    const attempt = await getDb().execute(reserveMfaAttempt(identity.nonce, identity.userId, identity.sessionId));
    if (!attempt.length) return { error: "Verification expired. Please sign in again." };
    const { error } = await identity.supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { error: "That code was not accepted. Try the current code; after three attempts, sign in again." };
    const verified = await ownerIdentity(true);
    if (verified.userId !== identity.userId || verified.sessionId !== identity.sessionId) throw new AuthorizationError();
    const established = await getDb().execute(establishAdminSession(identity.nonce, verified.userId, verified.sessionId));
    if (!established.length) return { error: "This login has already been used or expired. Please sign in again." };
    (await cookies()).delete(nonceName);
  } catch { return { error: "Verification could not finish. Please sign in again." }; }
  redirect("/admin");
}

export async function logout() {
  const identity = await ownerIdentity(false).catch(() => null);
  if (identity) {
    // Revoke database authorization first; do not report successful logout if this fails.
    await getDb().update(adminSessions).set({ isRevoked: true }).where(eq(adminSessions.userId, identity.userId));
    await identity.supabase.auth.signOut({ scope: "global" });
  } else {
    if (authConfigured()) await (await supabaseServer()).auth.signOut({ scope: "local" });
  }
  (await cookies()).delete(nonceName);
  redirect("/admin/login");
}
