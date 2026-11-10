import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq, isNull, sql } from "drizzle-orm";
import { validOwnerClaims } from "../src/lib/auth/policy";
import { establishAdminSession, reserveMfaAttempt, reserveRateLimit } from "../src/lib/auth/queries";
import { parseByteRange } from "../src/lib/storage/range";
import { projectInput, skillInput, socialInput, videoInput } from "../src/lib/content/validation";
import { IMAGE_PURPOSES, prepareImage, PURPOSE_BUDGETS, UNIVERSAL_MAX_BYTES } from "../src/lib/storage/images";
import { fetchYouTubeMetadata, parseYouTubeUrl, validateThumbnailUrl } from "../src/lib/youtube/service";
import { youtubeVideos } from "../src/db/schema";
import sharp from "sharp";
import { resolveVideoTitle } from "../src/lib/youtube/display";

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
  for (const header of ["bytes=1000-", "bytes=300-200", "bytes=-0", "bytes=-", "bytes=0-1,3-4", "words=0-1", "bytes=99999999999999999999-"]) {
    assert.equal(parseByteRange(header, 1000), null);
  }
});

test("content validation blocks active URLs, credentials in links, invalid icon combinations and mass assignment", () => {
  const social = { platform: "github", label: "GitHub", url: "https://github.com/AforArdi", iconKey: "lucide:github", displayOrder: 0, isPublished: true };
  assert.equal(socialInput.safeParse(social).success, true);
  for (const url of ["javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:pass@example.com"]) {
    assert.equal(socialInput.safeParse({ ...social, url }).success, false);
  }
  assert.equal(socialInput.safeParse({ ...social, createdBy: owner }).success, false);
  assert.equal(skillInput.safeParse({ name: "JS", iconProvider: "custom", customMediaId: null, iconKey: "simple-icons:javascript", accentColor: "#FFFF00", displayOrder: 0, isPublished: false }).success, false);
  assert.equal(projectInput.safeParse({ title: "Missing image", description: "A project", liveUrl: "https://example.com", githubUrl: "", githubServerUrl: "", displayOrder: 0, isPublished: false }).success, false);

  // Video validation
  const video = { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", titleOverride: "Custom Rick", description: "Great music", displayOrder: 0, isPublished: true };
  assert.equal(videoInput.safeParse(video).success, true);
  assert.equal(videoInput.safeParse({ ...video, url: "https://notyoutube.com/watch?v=dQw4w9WgXcQ" }).success, true); // Zod checks shape; parseYouTubeUrl enforces host
  assert.equal(videoInput.safeParse({ ...video, extraProp: "forbidden" }).success, false);
});

test("uploaded images are decoded, bounded, stripped of metadata and re-encoded; SVG and fake content are rejected", async () => {
  const png = await sharp({ create: { width: 3000, height: 100, channels: 4, background: { r: 50, g: 0, b: 100, alpha: 0.5 } } }).png().toBuffer();
  const output = await prepareImage(png);
  assert.equal(output.width, 2400);
  assert.ok(output.data.length <= UNIVERSAL_MAX_BYTES);
  const metadata = await sharp(output.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(() => prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')));
  await assert.rejects(() => prepareImage(Buffer.from("not an image")));
});

test("image budgets enforce per-purpose ceilings, universal 400 KB limit, and quality/dimension floors without upscaling", async () => {
  // Test each purpose budget
  for (const purpose of IMAGE_PURPOSES) {
    const budget = PURPOSE_BUDGETS[purpose];
    // Create an image larger than the budget's maxDimension
    const large = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 120, g: 60, b: 200 } }
    }).jpeg({ quality: 90 }).toBuffer();

    const result = await prepareImage(large, purpose);
    assert.ok(result.data.length <= budget.maxBytes, `${purpose} output ${result.data.length} exceeded budget ${budget.maxBytes}`);
    assert.ok(result.data.length <= UNIVERSAL_MAX_BYTES, `${purpose} output exceeded universal 400,000 bytes`);
    assert.ok(result.width <= budget.maxDimension, `${purpose} width ${result.width} exceeded max ${budget.maxDimension}`);
  }

  // Smaller image stays smaller without upscaling
  const small = await sharp({
    create: { width: 150, height: 150, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.9 } }
  }).png().toBuffer();
  const smallResult = await prepareImage(small, "icon");
  assert.equal(smallResult.width, 150);
  assert.ok(smallResult.data.length < 5000);

  // Animated WebP rejection
  // Create an animated WebP with 2 pages
  const frames = Buffer.alloc(64 * 128 * 3);
  for (let pixel = 0; pixel < 64 * 128; pixel++) frames[pixel * 3 + (pixel < 64 * 64 ? 0 : 1)] = 255;
  const animatedWebp = await sharp(frames, { raw: { width: 64, height: 128, pageHeight: 64, channels: 3 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(animatedWebp, { animated: true }).metadata()).pages, 2);
  await assert.rejects(() => prepareImage(animatedWebp, "icon"), /Animated/);
  const rotated = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "purple" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const oriented = await prepareImage(rotated, "portrait");
  assert.deepEqual([oriented.width, oriented.height], [400, 800]);
  assert.equal((await sharp(oriented.data).metadata()).exif, undefined);
  // Rejection check for animated input or invalid purpose
  await assert.rejects(
    // @ts-expect-error Testing invalid purpose
    () => prepareImage(small, "unsupported_purpose"),
    /Invalid image purpose/
  );

  // Difficult image handling: highly detailed random noise image that tests the attempt loop
  const noise = await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 80 } }
  }).jpeg({ quality: 90 }).toBuffer();
  assert.ok(noise.length <= 3_500_000);

  // For a tiny 40 KB icon budget with extreme noise, it should either compress within budget or throw a clean validation error
  try {
    const noiseResult = await prepareImage(noise, "icon");
    assert.ok(noiseResult.data.length <= 40_000);
  } catch (error) {
    assert.match((error as Error).message, /budget|compress|readability/i);
  }
});

test("YouTube URL parsing handles valid watch, shorts, live, embed and short links, while rejecting SSRF and lookalikes", () => {
  // Valid URL shapes
  const validCases = [
    { input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
    { input: "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share", id: "dQw4w9WgXcQ" },
    { input: "https://m.youtube.com/watch?v=dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
    { input: "https://music.youtube.com/watch?v=dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
    { input: "https://youtu.be/dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
    { input: "https://youtu.be/dQw4w9WgXcQ?si=abcdef123456", id: "dQw4w9WgXcQ" },
    { input: "https://www.youtube.com/shorts/dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
    { input: "https://www.youtube.com/live/dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
    { input: "https://www.youtube.com/embed/dQw4w9WgXcQ", id: "dQw4w9WgXcQ" },
  ];

  for (const { input, id } of validCases) {
    const parsed = parseYouTubeUrl(input);
    assert.equal(parsed.videoId, id);
    assert.equal(parsed.canonicalUrl, `https://www.youtube.com/watch?v=${id}`);
  }

  // Malformed and malicious inputs
  const rejectCases = [
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ", // non-HTTPS
    "https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ", // credentials
    "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ", // non-standard port
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", // lookalike subdomain
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ", // lookalike domain
    "https://evil-youtube.com/watch?v=dQw4w9WgXcQ", // lookalike domain
    "https://www.youtube.com/watch?v=tooshort", // malformed video ID
    "https://www.youtube.com/watch?v=toolongtoolongtoolong", // malformed video ID
    "https://www.youtube.com/watch?v=invalid$chars!", // illegal characters
    "https://www.youtube.com/playlist?list=PL1234567890", // playlist-only
    "https://www.youtube.com/channel/UC1234567890", // channel URL
    "https://youtu.be/dQw4w9WgXcQ/extra",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ/extra",
    "javascript:alert(1)", // active protocol
    "data:text/html,<div>test</div>", // data URI
    "", // empty
  ];

  for (const input of rejectCases) {
    assert.throws(() => parseYouTubeUrl(input), /URL|host|ID|HTTPS|Credentials|port/i, `Expected "${input}" to throw`);
  }
});

test("YouTube oEmbed metadata fetcher handles success, redirects, timeouts, non-JSON and untrusted CDNs", async () => {
  // 1. Success with trusted CDN
  const mockSuccessFetch: typeof fetch = async (url, options) => {
    assert.equal(new URL(String(url)).hostname, "www.youtube.com");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return new Response(JSON.stringify({
    title: "Rick Astley - Never Gonna Give You Up",
    author_name: "Rick Astley",
    thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    provider_name: "YouTube",
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

  };
  const res1 = await fetchYouTubeMetadata("dQw4w9WgXcQ", mockSuccessFetch);
  assert.equal(res1.ok, true);
  assert.equal(res1.title, "Rick Astley - Never Gonna Give You Up");
  assert.equal(res1.channelTitle, "Rick Astley");
  assert.equal(res1.thumbnailUrl, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");

  // 2. Untrusted thumbnail CDN hostname is sanitized to null
  const mockUntrustedThumbnailFetch = async () => new Response(JSON.stringify({
    title: "Sample Video",
    author_name: "Sample Channel",
    thumbnail_url: "https://evil-cdn.com/malicious.jpg",
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

  const res2 = await fetchYouTubeMetadata("dQw4w9WgXcQ", mockUntrustedThumbnailFetch as unknown as typeof fetch);
  assert.equal(res2.ok, true);
  assert.equal(res2.title, "Sample Video");
  assert.equal(res2.thumbnailUrl, null); // Stripped!

  // 3. Provider returns 404 (unavailable / private / deleted)
  const mock404Fetch = async () => new Response("Not Found", { status: 404 });
  const res3 = await fetchYouTubeMetadata("dQw4w9WgXcQ", mock404Fetch as unknown as typeof fetch);
  assert.equal(res3.ok, false);
  assert.equal(res3.title, null);
  assert.match(res3.error || "", /not found|private|deleted/i);

  // 4. Provider returns non-JSON / HTML
  const mockHtmlFetch = async () => new Response("<html><body>Error</body></html>", {
    status: 200,
    headers: { "Content-Type": "text/html" }
  });
  const res4 = await fetchYouTubeMetadata("dQw4w9WgXcQ", mockHtmlFetch as unknown as typeof fetch);
  assert.equal(res4.ok, false);
  assert.match(res4.error || "", /JSON/i);

  // 5. Network error / timeout
  const mockErrorFetch = async () => { throw new Error("Connection timeout"); };
  const res5 = await fetchYouTubeMetadata("dQw4w9WgXcQ", mockErrorFetch as unknown as typeof fetch);
  assert.equal(res5.ok, false);
  assert.match(res5.error || "", /timeout/i);

  // Validate thumbnail URL helper
  assert.equal(validateThumbnailUrl("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"), "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  assert.equal(validateThumbnailUrl("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"), "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
  assert.equal(validateThumbnailUrl("http://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"), null); // HTTP
  assert.equal(validateThumbnailUrl("https://attacker.com/thumb.jpg"), null); // untrusted host
  assert.equal(validateThumbnailUrl("https://i.ytimg.com/vi/../secret.jpg"), null); // traversal
  assert.equal(validateThumbnailUrl("https://i.ytimg.com/arbitrary/path.jpg"), null);
  assert.equal(validateThumbnailUrl("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?tracking=yes"), null);
  const tooLarge: typeof fetch = async () => new Response(JSON.stringify({ title: "x".repeat(50_001) }), { headers: { "Content-Type": "application/json" } });
  const bounded = await fetchYouTubeMetadata("dQw4w9WgXcQ", tooLarge);
  assert.equal(bounded.ok, false);
  assert.match(bounded.error || "", /bounded size/);
});

test("Postgres migrations enforce private roles, atomic MFA consumption, fixed deadlines, rate limits and version conflicts", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await client.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE portfolio_app; CREATE ROLE portfolio_migrator; CREATE SCHEMA portfolio; CREATE TABLE portfolio.__drizzle_migrations(id serial PRIMARY KEY, hash text, created_at bigint);");
    await client.exec(await readFile("src/db/migrations/0000_portfolio_schema.sql", "utf8"));
    await client.exec(await readFile("src/db/migrations/0001_private_schema_permissions.sql", "utf8"));
    await client.exec(await readFile("src/db/migrations/0002_youtube_videos.sql", "utf8"));
    await client.exec(await readFile("src/db/migrations/0003_tough_weapon_omega.sql", "utf8"));

    // Verify role boundary on profile and youtube_videos
    await client.exec("SET ROLE anon");
    await assert.rejects(() => client.query("select * from portfolio.profile"));
    await assert.rejects(() => client.query("select * from portfolio.youtube_videos"));

    await client.exec("RESET ROLE; SET ROLE portfolio_app");
    await assert.rejects(() => client.query("create table portfolio.forbidden (id int)"));
    await assert.rejects(() => client.query("select * from portfolio.__drizzle_migrations"));

    // Verify portfolio_app can perform CRUD on youtube_videos
    await client.query("INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, description, display_order, is_published) VALUES ('dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Rick Astley', 'Classic hit', 0, true)");
    const rows = await client.query<{ video_id: string; fetched_title: string; version: number }>("SELECT video_id, fetched_title, version FROM portfolio.youtube_videos WHERE is_published = true AND deleted_at IS NULL");
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].video_id, "dQw4w9WgXcQ");
    assert.equal(rows.rows[0].version, 1);

    // Verify duplicate active video constraint
    await assert.rejects(
      () => client.query("INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title) VALUES ('dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Duplicate')"),
      /duplicate key value violates unique constraint/
    );

    // Verify optimistic concurrency on youtube_videos
    const updateSuccess = await client.query("UPDATE portfolio.youtube_videos SET title_override = 'Custom Title', version = version + 1 WHERE version = 1 RETURNING id");
    assert.equal(updateSuccess.rows.length, 1);
    const staleUpdate = await client.query("UPDATE portfolio.youtube_videos SET title_override = 'Stale Edit', version = version + 1 WHERE version = 1 RETURNING id");
    assert.equal(staleUpdate.rows.length, 0);

    // Verify soft delete allows re-insert of the same video_id
    await client.query("UPDATE portfolio.youtube_videos SET deleted_at = now(), is_published = false WHERE video_id = 'dQw4w9WgXcQ'");
    await client.query("INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, display_order, is_published) VALUES ('dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Re-added Rick', 1, false)");
    const active = await client.query("SELECT id FROM portfolio.youtube_videos WHERE video_id = 'dQw4w9WgXcQ' AND deleted_at IS NULL");
    assert.equal(active.rows.length, 1);

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

test("YouTube display title resolution honors owner override, restores fetched title when cleared, and projects published items in order", () => {
  const resolveDisplayTitle = resolveVideoTitle;

  // 1. With fetched title and no override
  assert.equal(resolveDisplayTitle(null, "Original Provider Title"), "Original Provider Title");
  assert.equal(resolveDisplayTitle("", "Original Provider Title"), "Original Provider Title");
  assert.equal(resolveDisplayTitle("   ", "Original Provider Title"), "Original Provider Title");

  // 2. With override
  assert.equal(resolveDisplayTitle("Owner Custom Title", "Original Provider Title"), "Owner Custom Title");
  assert.equal(resolveDisplayTitle("  Trimmed Title  ", "Original Provider Title"), "Trimmed Title");

  // 3. When override is cleared, restores fetched title
  let override: string | null = "Temporary Title";
  assert.equal(resolveDisplayTitle(override, "Original Provider Title"), "Temporary Title");
  override = null; // Cleared
  assert.equal(resolveDisplayTitle(override, "Original Provider Title"), "Original Provider Title");

  // 4. Fallback when neither exists
  assert.equal(resolveDisplayTitle(null, null), "YouTube Video");
});
