import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "@/db";
import { requireOwnerAdmin } from "@/lib/auth/guard";
import { authConfig } from "@/lib/auth/config";
import { withSecurityLock } from "@/lib/auth/security";
import { deleteLoginProofs, finishPasswordChange, revokeAuthorizations, startPasswordChange } from "@/lib/auth/security-queries";
import { reserveRateLimit } from "@/lib/auth/queries";
import { passwordChangeInput } from "@/lib/auth/password-input";
import { PasswordChangeFailure, runPasswordChange } from "@/lib/auth/password-workflow";
import { apiError, assertSameOrigin, boundedBody, HttpError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const owner = await requireOwnerAdmin();
    const { data, error } = await owner.supabase.auth.mfa.listFactors();
    if (error) throw new HttpError(502, "Authenticators could not be loaded.");
    return Response.json({ factors: data.totp.filter(f => f.status === "verified").map(f => ({ id: f.id, name: f.friendly_name || "Authenticator" })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const owner = await requireOwnerAdmin();
    const allowed = await getDb().execute(reserveRateLimit(`password-change:${owner.userId}`, 5, 900));
    if (!allowed.length) throw new HttpError(429, "Too many attempts. Wait 15 minutes before trying again.");
    const input = passwordChangeInput.parse(JSON.parse((await boundedBody(request, 4000)).toString("utf8")));
    const config = authConfig();
    const { data: { user }, error: userError } = await owner.supabase.auth.getUser();
    if (userError || !user?.email) throw new HttpError(401, "Sign in again before changing your password.");
    // Publishable key and private memory-only session: never replace browser SSR cookies.
    const isolated = createClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, options) => fetch(url, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000) }) },
    });
    const operation = randomUUID();
    try {
      await runPasswordChange({
        verify: async () => {
          const signedIn = await isolated.auth.signInWithPassword({ email: user.email!, password: input.currentPassword });
          if (signedIn.error || signedIn.data.user?.id !== owner.userId) throw new HttpError(400, "Your current password was not accepted.");
          const factors = await isolated.auth.mfa.listFactors();
          if (factors.error || !factors.data.totp.some(f => f.id === input.factorId && f.status === "verified")) throw new HttpError(400, "Choose one of your verified authenticators.");
          const verified = await isolated.auth.mfa.challengeAndVerify({ factorId: input.factorId, code: input.code });
          if (verified.error || verified.data.user.id !== owner.userId) throw new HttpError(400, "That authenticator code was not accepted. Use the current code.");
        },
        begin: async () => {
          await withSecurityLock(owner.userId, async tx => {
            const started = await tx.execute(startPasswordChange(owner.userId, operation, owner.sessionId));
            if (!started.length) throw new HttpError(401, "Your dashboard authorization expired. Sign in again.");
            await tx.execute(revokeAuthorizations(owner.userId));
            await tx.execute(deleteLoginProofs(owner.userId));
          });
        },
        update: () => isolated.auth.updateUser({ password: input.newPassword, current_password: input.currentPassword }),
        revokeProviderSessions: async () => {
          const { error } = await isolated.auth.signOut({ scope: "global" });
          if (error) throw new Error("Provider sign-out could not be confirmed.");
        },
        finish: async () => {
          await getDb().transaction(async tx => {
            await tx.execute(revokeAuthorizations(owner.userId));
            await tx.execute(deleteLoginProofs(owner.userId));
            const finished = await tx.execute(finishPasswordChange(owner.userId, operation));
            if (!finished.length) throw new Error("Security change ownership was lost.");
          });
        },
      });
    } finally {
      // Dispose only the temporary verification session, including wrong-code attempts.
      await isolated.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    return Response.json({ changed: true, signInAgain: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PasswordChangeFailure) return Response.json({ error: error.message, signInAgain: error.signInAgain }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
    return apiError(error);
  }
}
