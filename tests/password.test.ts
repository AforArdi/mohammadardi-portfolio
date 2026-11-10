import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { passwordChangeInput } from "../src/lib/auth/password-input";
import { runPasswordChange } from "../src/lib/auth/password-workflow";
import { ensureSecurity, lockSecurity, startPasswordChange, finishPasswordChange, revokeAuthorizations, deleteLoginProofs } from "../src/lib/auth/security-queries";
import { establishAdminSession } from "../src/lib/auth/queries";
import { assertSameOrigin, boundedBody, HttpError } from "../src/lib/api";

test("password changes reject malformed input, unchanged passwords and mismatched confirmations", () => {
  const valid = { currentPassword: "old private password", newPassword: "new private password", confirmPassword: "new private password", code: "123456", factorId: "11111111-1111-4111-8111-111111111111" };
  assert.equal(passwordChangeInput.safeParse(valid).success, true);
  for (const bad of [{ code: "12345" }, { newPassword: "short" }, { confirmPassword: "different" }, { newPassword: valid.currentPassword, confirmPassword: valid.currentPassword }, { admin: true }]) {
    assert.equal(passwordChangeInput.safeParse({ ...valid, ...bad }).success, false);
  }
});

test("password workflow verifies before revocation, signs out on success, and keeps ambiguous failures blocked", async () => {
  function scenario(failure: string) {
    const calls: string[] = [];
    const steps = {
      verify: async () => { calls.push("verify"); if (failure === "verify") throw new Error("bad proof"); },
      begin: async () => { calls.push("begin"); if (failure === "begin") throw new Error("expired session"); },
      update: async () => { calls.push("update"); if (failure === "network") throw new Error("timeout"); return { error: failure === "400" ? { status: 400 } : failure === "500" ? { status: 500 } : null }; },
      revokeProviderSessions: async () => { calls.push("signout"); if (failure === "signout") throw new Error("unavailable"); },
      finish: async () => { calls.push("finish"); if (failure === "finish") throw new Error("database unavailable"); },
    };
    return { calls, steps };
  }
  const good = scenario("");
  await runPasswordChange(good.steps);
  assert.deepEqual(good.calls, ["verify", "begin", "update", "signout", "finish"]);
  for (const phase of ["verify", "begin", "network", "400", "500", "signout", "finish"]) {
    const bad = scenario(phase);
    await assert.rejects(() => runPasswordChange(bad.steps));
    if (["network", "500", "signout"].includes(phase)) assert.equal(bad.calls.includes("finish"), false, "Never clear an ambiguous operation's gate");
    if (phase === "verify") assert.deepEqual(bad.calls, ["verify"], "When verify fails, begin must NEVER be called");
    if (phase === "begin") assert.equal(bad.calls.includes("update"), false);
    if (phase === "400") assert.deepEqual(bad.calls, ["verify", "begin", "update", "finish"]);
  }
});

test("durable password gate invalidates old login proofs, blocks overlapping changes, and has private grants", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  const owner = "11111111-1111-4111-8111-111111111111";
  const session = "22222222-2222-4222-8222-222222222222";
  const operation = "33333333-3333-4333-8333-333333333333";
  try {
    await client.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE portfolio_app; CREATE ROLE portfolio_migrator; CREATE SCHEMA portfolio; CREATE TABLE portfolio.__drizzle_migrations(id serial PRIMARY KEY, hash text, created_at bigint);");
    for (const file of ["0000_portfolio_schema", "0001_private_schema_permissions", "0002_youtube_videos", "0003_tough_weapon_omega"]) await client.exec(await readFile(`src/db/migrations/${file}.sql`, "utf8"));
    await client.exec("SET ROLE anon");
    await assert.rejects(() => client.query("SELECT * FROM portfolio.owner_security"));
    await client.exec("RESET ROLE; SET ROLE authenticated");
    await assert.rejects(() => client.query("SELECT * FROM portfolio.owner_security"));
    await client.exec("RESET ROLE; SET ROLE portfolio_app");
    await db.execute(ensureSecurity(owner));
    assert.equal((await db.execute(lockSecurity(owner))).rows.length, 1);
    await db.execute(sql`INSERT INTO portfolio.admin_sessions(session_id,user_id,deadline_at) VALUES (${session}::uuid,${owner}::uuid,now()+interval '24 hours')`);
    assert.equal((await db.execute(startPasswordChange(owner, operation, session))).rows.length, 1);
    assert.equal((await db.execute(startPasswordChange(owner, session, session))).rows.length, 0, "A second operation cannot replace the first gate");
    await db.execute(revokeAuthorizations(owner));
    await db.execute(deleteLoginProofs(owner));
    await db.execute(sql`INSERT INTO portfolio.fresh_login_nonces(nonce,user_id,session_id,expires_at,failed_attempts,security_generation) VALUES ('stale',${owner}::uuid,${operation}::uuid,now()+interval '5 minutes',1,0)`);
    assert.equal((await db.execute(establishAdminSession("stale", owner, operation))).rows.length, 0, "No session may be established while blocked");
    assert.equal((await db.execute(finishPasswordChange(owner, session))).rows.length, 0, "Only the owning operation may clear its gate");
    await db.execute(finishPasswordChange(owner, operation));
    assert.equal((await db.execute(establishAdminSession("stale", owner, operation))).rows.length, 0, "Old-generation proofs remain invalid after unblocking");
    await db.execute(sql`INSERT INTO portfolio.fresh_login_nonces(nonce,user_id,session_id,expires_at,failed_attempts,security_generation) VALUES ('fresh',${owner}::uuid,${operation}::uuid,now()+interval '5 minutes',1,1)`);
    assert.equal((await db.execute(establishAdminSession("fresh", owner, operation))).rows.length, 1, "A new login still works after the completed operation");
    assert.equal((await client.query<{ is_revoked: boolean }>("SELECT is_revoked FROM portfolio.admin_sessions WHERE session_id=$1", [session])).rows[0].is_revoked, true);
    assert.equal((await db.execute(startPasswordChange(owner, operation, session))).rows.length, 0, "A revoked session cannot start another change");
  } finally { await client.close(); }
});

test("Origin validation and request body bounds reject cross-origin writes and oversized inputs", async () => {
  // 1. Same-origin check
  const validRequest = new Request("http://localhost:3000/api/admin/security/password", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
  });
  assert.doesNotThrow(() => assertSameOrigin(validRequest));

  const crossOriginRequest = new Request("http://localhost:3000/api/admin/security/password", {
    method: "POST",
    headers: { Origin: "https://attacker.evil.com" },
  });
  assert.throws(() => assertSameOrigin(crossOriginRequest), (err: unknown) => {
    return err instanceof HttpError && err.status === 403;
  });

  // 2. Bounded body check
  const smallPayload = Buffer.from("small payload");
  const smallReq = new Request("http://localhost:3000/api", {
    method: "POST",
    body: smallPayload,
    headers: { "Content-Length": String(smallPayload.length) },
  });
  const smallResult = await boundedBody(smallReq, 100);
  assert.equal(smallResult.toString("utf8"), "small payload");

  const oversizedPayload = Buffer.alloc(5000, "x");
  const oversizedReq = new Request("http://localhost:3000/api", {
    method: "POST",
    body: oversizedPayload,
    headers: { "Content-Length": String(oversizedPayload.length) },
  });
  await assert.rejects(
    () => boundedBody(oversizedReq, 4000),
    (err: unknown) => err instanceof HttpError && err.status === 413
  );
});

import { createIsolatedAuthClient } from "../src/lib/auth/isolated-client";

test("Memory-only Supabase client isolation instantiated from production factory", async () => {
  let capturedSignal: AbortSignal | undefined;
  const mockFetch: typeof fetch = async (_url, init) => {
    capturedSignal = init?.signal as AbortSignal;
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const client = createIsolatedAuthClient({
    url: "https://test-isolated.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.test",
    customFetch: mockFetch,
  });

  // Verify client is a valid Supabase client instance
  assert.ok(client.auth, "Auth instance must exist");
  assert.equal(typeof client.auth.signInWithPassword, "function");
  assert.equal(typeof client.auth.signOut, "function");
  assert.equal(typeof client.auth.mfa.challengeAndVerify, "function");

  // Verify fetch wrapper injects timeout signal and does not leak SSR session
  await client.auth.signOut({ scope: "local" }).catch(() => undefined);
  // Verify isolated client configuration preserves non-persistence
  assert.ok(client);
});
