import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { validOwnerClaims } from "../src/lib/auth/policy";
import { establishAdminSession, reserveMfaAttempt, reserveRateLimit } from "../src/lib/auth/queries";
import { parseByteRange } from "../src/lib/storage/range";
import { projectInput, skillInput, socialInput } from "../src/lib/content/validation";
import { prepareImage } from "../src/lib/storage/images";
import sharp from "sharp";

const owner = "11111111-1111-4111-8111-111111111111";
const session = "22222222-2222-4222-8222-222222222222";

test("only the allowlisted owner with verified AAL2 claims can authorize admin access", () => {
  const claims = { sub: owner, session_id: session, aud: "authenticated", aal: "aal2" };
  assert.equal(validOwnerClaims(claims, owner), true);
  assert.equal(validOwnerClaims({ ...claims, aal: "aal1" }, owner), false);
  assert.equal(validOwnerClaims({ ...claims, sub: session, user_metadata: { admin: true } }, owner), false);
  assert.equal(validOwnerClaims({ ...claims, aud: "anon" }, owner), false);
  assert.equal(validOwnerClaims({ ...claims, session_id: null }, owner), false);
});

test("PDF range parsing handles bounded, suffix, open-ended and invalid ranges", () => {
  assert.deepEqual(parseByteRange(null, 1000), { start: 0, end: 999, partial: false });
  assert.deepEqual(parseByteRange("bytes=100-200", 1000), { start: 100, end: 200, partial: true });
  assert.deepEqual(parseByteRange("bytes=900-", 1000), { start: 900, end: 999, partial: true });
  assert.deepEqual(parseByteRange("bytes=-200", 1000), { start: 800, end: 999, partial: true });
  assert.deepEqual(parseByteRange("bytes=-2000", 1000), { start: 0, end: 999, partial: true });
  for (const header of ["bytes=1000-", "bytes=300-200", "bytes=-0", "bytes=-", "bytes=0-1,3-4", "words=0-1", "bytes=99999999999999999999-"]) assert.equal(parseByteRange(header, 1000), null);
});

test("content validation blocks active URLs, credentials in links, invalid icon combinations and mass assignment", () => {
  const social = { platform: "github", label: "GitHub", url: "https://github.com/AforArdi", iconKey: "lucide:github", displayOrder: 0, isPublished: true };
  assert.equal(socialInput.safeParse(social).success, true);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:pass@example.com"]) assert.equal(socialInput.safeParse({ ...social, url }).success, false);
  assert.equal(socialInput.safeParse({ ...social, createdBy: owner }).success, false);
  assert.equal(skillInput.safeParse({ name: "JS", iconProvider: "custom", customMediaId: null, iconKey: "simple-icons:javascript", accentColor: "#FFFF00", displayOrder: 0, isPublished: false }).success, false);
  assert.equal(projectInput.safeParse({ title: "Missing image", description: "A project", liveUrl: "https://example.com", githubUrl: "", githubServerUrl: "", displayOrder: 0, isPublished: false }).success, false);
});

test("uploaded images are decoded, bounded, stripped of metadata and re-encoded; SVG and fake content are rejected", async () => {
  const png = await sharp({ create: { width: 3000, height: 100, channels: 4, background: { r: 50, g: 0, b: 100, alpha: 0.5 } } }).png().toBuffer();
  const output = await prepareImage(png);
  assert.equal(output.width, 2400);
  const metadata = await sharp(output.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(() => prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')));
  await assert.rejects(() => prepareImage(Buffer.from("not an image")));
});

test("Postgres migrations enforce private roles, atomic MFA consumption, fixed deadlines, rate limits and version conflicts", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await client.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE portfolio_app; CREATE ROLE portfolio_migrator; CREATE SCHEMA portfolio; CREATE TABLE portfolio.__drizzle_migrations(id serial PRIMARY KEY, hash text, created_at bigint);");
    await client.exec(await readFile("src/db/migrations/0000_portfolio_schema.sql", "utf8"));
    await client.exec(await readFile("src/db/migrations/0001_private_schema_permissions.sql", "utf8"));
    await client.exec("SET ROLE anon");
    await assert.rejects(() => client.query("select * from portfolio.profile"));
    await client.exec("RESET ROLE; SET ROLE portfolio_app");
    await assert.rejects(() => client.query("create table portfolio.forbidden (id int)"));
    await assert.rejects(() => client.query("select * from portfolio.__drizzle_migrations"));
    await client.exec("RESET ROLE");
    const nonce = "hash-of-a-login-nonce";
    await db.execute(sql`INSERT INTO portfolio.fresh_login_nonces(nonce,user_id,session_id,expires_at) VALUES (${nonce},${owner}::uuid,${session}::uuid,now()+interval '5 minutes')`);
    assert.equal((await db.execute(reserveMfaAttempt(nonce, session, session))).rows.length, 0, "A nonce is bound to its owner");
    await db.execute(sql`INSERT INTO portfolio.fresh_login_nonces(nonce,user_id,session_id,expires_at,failed_attempts) VALUES ('expired',${owner}::uuid,${session}::uuid,now()-interval '1 second',1)`);
    assert.equal((await db.execute(establishAdminSession("expired", owner, session))).rows.length, 0, "Expired fresh-login proof is rejected");
    assert.equal((await db.execute(establishAdminSession(nonce, owner, session))).rows.length, 0, "MFA must have been attempted before authorization");
    assert.equal((await db.execute(reserveMfaAttempt(nonce, owner, session))).rows.length, 1);
    const races = await Promise.all([db.execute(establishAdminSession(nonce, owner, session)), db.execute(establishAdminSession(nonce, owner, session))]);
    assert.equal(races.reduce((count, result) => count + result.rows.length, 0), 1, "Only one atomic consumption can authorize the session");
    const first = await client.query<{ duration: string; deadline: string }>("select extract(epoch from deadline_at-aal2_verified_at)::text as duration, deadline_at::text as deadline from portfolio.admin_sessions");
    assert.equal(Number(first.rows[0].duration), 86400);
    await db.execute(sql`INSERT INTO portfolio.fresh_login_nonces(nonce,user_id,session_id,expires_at,failed_attempts) VALUES ('second',${owner}::uuid,${session}::uuid,now()+interval '5 minutes',1)`);
    assert.equal((await db.execute(establishAdminSession("second", owner, session))).rows.length, 0);
    const after = await client.query<{ deadline: string }>("select deadline_at::text as deadline from portfolio.admin_sessions");
    assert.equal(after.rows[0].deadline, first.rows[0].deadline, "A later nonce cannot extend the same session");
    await db.execute(sql`INSERT INTO portfolio.fresh_login_nonces(nonce,user_id,session_id,expires_at) VALUES ('attempts',${owner}::uuid,${session}::uuid,now()+interval '5 minutes')`);
    for (let attempt = 0; attempt < 3; attempt++) assert.equal((await db.execute(reserveMfaAttempt("attempts", owner, session))).rows.length, 1);
    assert.equal((await db.execute(reserveMfaAttempt("attempts", owner, session))).rows.length, 0);
    const limits = await Promise.all(Array.from({ length: 10 }, () => db.execute(reserveRateLimit("test-ip", 5, 900))));
    assert.equal(limits.reduce((count, result) => count + result.rows.length, 0), 5);
    await client.exec("update portfolio.rate_limit_buckets set bytes_served=5000000000 where key='test-ip'");
    const bytes = await client.query<{ bytes_served: number }>("select bytes_served from portfolio.rate_limit_buckets where key='test-ip'");
    assert.equal(Number(bytes.rows[0].bytes_served), 5_000_000_000);
    await client.exec("insert into portfolio.social_links(platform,label,url,icon_key) values('github','GitHub','https://github.com/AforArdi','lucide:github')");
    const update = "update portfolio.social_links set label='Updated', version=version+1 where version=1 returning id";
    assert.equal((await client.query(update)).rows.length, 1);
    assert.equal((await client.query(update)).rows.length, 0);
  } finally { await client.close(); }
});
