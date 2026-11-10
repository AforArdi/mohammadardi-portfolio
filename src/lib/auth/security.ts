import "server-only";
import { getDb } from "@/db";
import { AuthorizationError } from "./policy";
import { ensureSecurity, lockSecurity } from "./security-queries";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

// Serialize proof issuance/finalization against credential changes. No network I/O under the lock.
export async function withSecurityLock<T>(userId: string, work: (tx: Transaction, generation: number) => Promise<T>) {
  return getDb().transaction(async tx => {
    await tx.execute(ensureSecurity(userId));
    const rows = await tx.execute(lockSecurity(userId));
    const state = rows[0];
    if (!state || state.password_change_id) throw new AuthorizationError("A security change is pending. Sign in again later.");
    return work(tx, Number(state.generation));
  });
}
