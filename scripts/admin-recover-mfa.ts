import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { required } from "./env";

if (!process.argv.includes("--execute")) throw new Error("Offline recovery removes owner authenticators and revokes portfolio admin sessions. Re-run with --execute only if you have lost access.");
const client = postgres(required("DATABASE_ADMIN_URL"), { ssl: "require", max: 1, prepare: false });
try {
  const userId = required("OWNER_USER_ID");
  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } });
  // Revoke application authorization before changing any MFA factor.
  await client.begin(async tx => {
    await tx`update portfolio.admin_sessions set is_revoked = true where user_id = ${userId}::uuid`;
    await tx`delete from portfolio.fresh_login_nonces where user_id = ${userId}::uuid`;
  });
  const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error("Could not list factors. All portfolio admin sessions were revoked.");
  for (const factor of data.factors) {
    const result = await supabase.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
    if (result.error) throw new Error("Factor removal failed. Existing portfolio admin sessions remain revoked.");
  }
  console.log("Portfolio admin sessions revoked and lost factors removed. Sign in with your password and enroll a new authenticator.");
} catch (error) { console.error(error instanceof Error ? error.message : "Recovery failed"); process.exitCode = 1; }
finally { await client.end(); }
