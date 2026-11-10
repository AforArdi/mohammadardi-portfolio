export class PasswordChangeFailure extends Error {
  constructor(message: string, public readonly status: number, public readonly signInAgain: boolean) { super(message); }
}

interface PasswordChangeSteps {
  verify(): Promise<void>;
  begin(): Promise<void>;
  update(): Promise<{ error: { status?: number } | null }>;
  revokeProviderSessions(): Promise<void>;
  finish(): Promise<void>;
}

// The durable gate must be committed BEFORE making the non-transactional Auth write.
// An ambiguous write/revocation failure leaves the gate closed for offline inspection.
export async function runPasswordChange(steps: PasswordChangeSteps) {
  await steps.verify();
  await steps.begin();
  let result;
  try { result = await steps.update(); }
  catch { throw new PasswordChangeFailure("The change could not be confirmed. Dashboard access is paused; use the documented offline security recovery procedure.", 503, true); }
  if (result.error) {
    const status = result.error.status || 0;
    if (status >= 400 && status < 500) {
      try { await steps.finish(); }
      catch { throw new PasswordChangeFailure("The provider rejected the change, but dashboard access remains paused. Use offline security recovery before signing in again.", 503, true); }
      throw new PasswordChangeFailure("The password provider rejected the change. Sign in again with your current password, then try a different new password.", 400, true);
    }
    throw new PasswordChangeFailure("The change could not be confirmed. Dashboard access is paused; use the documented offline security recovery procedure.", 503, true);
  }
  try {
    await steps.revokeProviderSessions();
    await steps.finish();
  } catch {
    throw new PasswordChangeFailure("Your password was changed, but sign-out could not be confirmed. Dashboard access is paused; use offline security recovery before signing in again.", 503, true);
  }
}
