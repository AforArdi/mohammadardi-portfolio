import postgres from "postgres";
import { required } from "./env";

// Offline operation recovery only: this neither changes a password nor removes MFA.
const client = postgres(required("DATABASE_ADMIN_URL"), { ssl: "require", max: 1, prepare: false });
try {
  const owner = required("OWNER_USER_ID");
  const [state] = await client`SELECT password_change_id, password_change_started_at FROM portfolio.owner_security WHERE user_id=${owner}::uuid`;
  if (!state?.password_change_id) { console.log("No interrupted password change is blocking access."); }
  else if (!process.argv.includes("--execute")) {
    console.log(`Pending security operation: ${state.password_change_id}. Stop the application and wait at least 15 minutes before using the recovery command documented in docs/setup/BACKEND_SETUP.md.`);
  } else {
    const operation = process.argv.find(argument => argument.startsWith("--operation="))?.slice(12);
    if (!operation || !process.argv.includes("--confirm-app-stopped") || operation !== state.password_change_id) throw new Error("Stop the application, then supply --confirm-app-stopped and the exact --operation ID.");
    await client.begin(async tx => {
      const cleared = await tx`UPDATE portfolio.owner_security SET generation=generation+1, password_change_id=NULL, password_change_started_at=NULL WHERE user_id=${owner}::uuid AND password_change_id=${operation}::uuid AND password_change_started_at < now()-interval '15 minutes' RETURNING user_id`;
      if (!cleared.length) throw new Error("The operation is still recent or changed. Leave the application stopped and inspect it before retrying.");
      await tx`UPDATE portfolio.admin_sessions SET is_revoked=true WHERE user_id=${owner}::uuid`;
      await tx`DELETE FROM portfolio.fresh_login_nonces WHERE user_id=${owner}::uuid`;
    });
    console.log("Interrupted-operation gate cleared; all application sessions/proofs revoked. Password and authenticators were not changed. Restart and sign in privately.");
  }
} catch { console.error("Security recovery could not finish. Confirm the application is stopped, the operation ID matches, and at least 15 minutes have elapsed."); process.exitCode = 1; }
finally { await client.end(); }
