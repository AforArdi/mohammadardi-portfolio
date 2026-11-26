import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readMigrationFiles } from "drizzle-orm/migrator";
import sharp from "sharp";
import { iconCatalog, iconRegistry, searchIcons } from "../src/lib/content/icons";
import { socialInput } from "../src/lib/content/validation";
import { saveContent } from "../src/lib/content/mutations";
import { drainCleanup, reconcileCleanup } from "../src/lib/storage/cleanup";
import { servePublicImage } from "../src/lib/storage/public-media";
import { HttpError } from "../src/lib/api";

const assetId = "11111111-1111-4111-8111-111111111111";
const replacementId = "22222222-2222-4222-8222-222222222222";
const missingId = "33333333-3333-4333-8333-333333333333";
const pdfId = "44444444-4444-4444-8444-444444444444";
const social = { platform: "WhatsApp", label: "Chat on WhatsApp", url: "https://wa.me/123456789", iconKey: "simple-icons:whatsapp", displayOrder: 0, isPublished: true };

test("icon search finds social brands and common aliases without losing saved library keys", () => {
  for (const [query, key] of [
    ["WhatsApp", "simple-icons:whatsapp"], ["whats app", "simple-icons:whatsapp"],
    ["telegram", "simple-icons:telegram"], ["TG", "simple-icons:telegram"],
    ["Twitter", "brand:x"], ["Next.js", "simple-icons:nextdotjs"],
    ["node js", "simple-icons:nodedotjs"], ["REST API", "lucide:network"],
  ]) assert.ok(searchIcons(query).some(icon => icon.key === key), query);
  assert.equal(searchIcons("Twitter", false).length, 0, "Skills cannot select the custom X provider");
  assert.equal(searchIcons("no-such-service").length, 0);
  assert.equal(new Set(iconCatalog.map(icon => icon.key)).size, iconCatalog.length);
  for (const key of ["lucide:github", "lucide:linkedin", "lucide:instagram", "lucide:facebook", "brand:x", "simple-icons:jsonwebtokens"]) {
    assert.ok(Object.hasOwn(iconRegistry, key), "Previously saved icon keys must remain valid");
  }
});

test("social input accepts legacy library selections and requires exactly one valid icon source", () => {
  assert.equal(socialInput.parse(social).customMediaId, null, "Old requests do not need a customMediaId field");
  assert.equal(socialInput.safeParse({ ...social, iconKey: null, customMediaId: assetId }).success, true);
  for (const selection of [
    { iconKey: null, customMediaId: null },
    { iconKey: social.iconKey, customMediaId: assetId },
    { iconKey: "", customMediaId: null },
    { iconKey: " ", customMediaId: null },
    { iconKey: null, customMediaId: "not-a-uuid" },
  ]) assert.equal(socialInput.safeParse({ ...social, ...selection }).success, false);
  for (const url of ["javascript:alert(1)", "https://user:pass@wa.me/1", "whatsapp://send", "http://t.me/example"]) {
    assert.equal(socialInput.safeParse({ ...social, url }).success, false);
  }
  assert.equal(socialInput.safeParse({ ...social, bucketName: "public-media" }).success, false);
});

test("custom social icons: migration preserves links; publish, replace, unpublish and cleanup use production boundaries", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 30, g: 200, b: 120, alpha: 0.8 } } }).webp().toBuffer();
  const objects = new Map<string, Blob>();
  const removed: string[] = [];
  const downloads: string[] = [];
  const storage = {
    from: (bucket: string) => ({
      download: async (path: string) => {
        downloads.push(`${bucket}/${path}`);
        const data = objects.get(`${bucket}/${path}`) ?? null;
        return { data, error: data ? null : new Error("Missing fixture image") };
      },
      upload: async (path: string, data: Blob) => { objects.set(`${bucket}/${path}`, data); return { error: null }; },
      remove: async (paths: string[]) => {
        for (const path of paths) { removed.push(`${bucket}/${path}`); objects.delete(`${bucket}/${path}`); }
        return { error: null };
      },
    }),
  };
  async function insertAsset(id: string, mime = "image/webp") {
    const path = `${id}.webp`;
    objects.set(`private-staging/${path}`, new Blob([new Uint8Array(bytes)], { type: mime }));
    await client.query(`INSERT INTO portfolio.media_assets (id, bucket_name, storage_path, filename, mime_type, file_size_bytes, width, height, created_by, created_at)
      VALUES ($1, 'private-staging', $2, 'icon.webp', $3, $4, 32, 32, 'fixture-owner', now() - interval '2 days')`, [id, path, mime, bytes.length]);
  }
  const isBadIcon = (error: unknown) => error instanceof HttpError && error.status === 400;
  try {
    await client.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE portfolio_app; CREATE ROLE portfolio_migrator; CREATE SCHEMA portfolio; CREATE TABLE portfolio.__drizzle_migrations(id serial PRIMARY KEY, hash text, created_at bigint);");
    const migrations = readMigrationFiles({ migrationsFolder: "src/db/migrations" });
    // Seed a legacy row before migration 0004, then apply it and any later migrations.
    for (const migration of migrations.slice(0, 4)) for (const statement of migration.sql) await client.exec(statement);
    await client.exec("INSERT INTO portfolio.social_links (platform, label, url, icon_key) VALUES ('github', 'GitHub', 'https://github.com/example', 'lucide:github');");
    for (const migration of migrations.slice(4)) for (const statement of migration.sql) await client.exec(statement);
    const legacy = await client.query<{ icon_key: string; custom_media_id: string | null }>("SELECT icon_key, custom_media_id FROM portfolio.social_links");
    assert.deepEqual(legacy.rows[0], { icon_key: "lucide:github", custom_media_id: null });
    for (const role of ["anon", "authenticated"]) {
      await client.exec(`SET ROLE ${role}`);
      await assert.rejects(() => client.query("SELECT custom_media_id FROM portfolio.social_links"));
      await client.exec("RESET ROLE");
    }
    await client.exec("SET ROLE portfolio_app");
    await insertAsset(assetId);
    await insertAsset(replacementId);
    await insertAsset(pdfId, "application/pdf");

    // Database-level exclusivity protects direct SQL as well as the API.
    await assert.rejects(() => client.exec("INSERT INTO portfolio.social_links (platform,label,url,icon_key) VALUES ('invalid','Invalid','https://example.com',NULL)"));
    await assert.rejects(() => client.query("INSERT INTO portfolio.social_links (platform,label,url,icon_key,custom_media_id) VALUES ('invalid','Invalid','https://example.com','lucide:globe',$1)", [assetId]));
    await assert.rejects(() => client.query("INSERT INTO portfolio.social_links (platform,label,url,icon_key,custom_media_id) VALUES ('invalid','Invalid','https://example.com',NULL,$1)", [missingId]));
    await saveContent("socials", { data: social }, db, storage);
    await saveContent("socials", { data: { ...social, platform: "Telegram", url: "https://t.me/example", iconKey: "simple-icons:telegram" } }, db, storage);
    for (const data of [
      { ...social, iconKey: "external:unknown" },
      { ...social, iconKey: "__proto__" },
      { ...social, iconKey: null, customMediaId: missingId },
      { ...social, iconKey: null, customMediaId: pdfId },
    ]) await assert.rejects(() => saveContent("socials", { data }, db, storage), isBadIcon);
    await client.query("UPDATE portfolio.media_assets SET width=1600, file_size_bytes=250000 WHERE id=$1", [replacementId]);
    await assert.rejects(() => saveContent("socials", { data: { ...social, iconKey: null, customMediaId: replacementId } }, db, storage), isBadIcon);
    await client.query("UPDATE portfolio.media_assets SET width=32, file_size_bytes=$2 WHERE id=$1", [replacementId, bytes.length]);

    const custom = { ...social, iconKey: null, customMediaId: assetId, isPublished: false };
    const draft = await saveContent("socials", { data: custom }, db, storage);
    assert.ok(draft && typeof draft === "object" && "id" in draft && typeof draft.id === "string");
    const id = draft.id;
    const getImage = () => servePublicImage("social", id, { db, storage });
    assert.equal((await getImage()).status, 404);
    assert.equal(downloads.length, 0, "Drafts must not even attempt a Storage download");
    await reconcileCleanup(db);
    const draftJobs = await client.query("SELECT id FROM portfolio.storage_cleanup_queue WHERE storage_path=$1", [`${assetId}.webp`]);
    assert.equal(draftJobs.rows.length, 0, "Reconciliation must protect draft social references");

    const published = await saveContent("socials", { id, expectedVersion: 1, data: { ...custom, isPublished: true } }, db, storage);
    assert.ok(published && typeof published === "object" && "version" in published);
    assert.equal(published.version, 2);
    assert.ok(objects.has(`public-media/${assetId}.webp`));
    const response = await getImage();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    await assert.rejects(() => saveContent("socials", { id, expectedVersion: 1, data: { ...custom, isPublished: true } }, db, storage), (error: unknown) => error instanceof HttpError && error.status === 409);

    await saveContent("socials", { id, expectedVersion: 2, data: custom }, db, storage);
    const previousDownloads = downloads.length;
    assert.equal((await getImage()).status, 404);
    assert.equal(downloads.length, previousDownloads, "Unpublishing must immediately stop public downloads");

    await saveContent("socials", { id, expectedVersion: 3, data: { ...custom, customMediaId: replacementId, isPublished: true } }, db, storage);
    await reconcileCleanup(db);
    // Simulate the 24-hour grace period expiring in this isolated database, never against hosted data.
    await client.exec("UPDATE portfolio.storage_cleanup_queue SET next_retry_at=now() WHERE completed_at IS NULL");
    await drainCleanup(100, db, storage);
    assert.ok(removed.includes(`public-media/${assetId}.webp`), "Replaced icon is eligible for cleanup");
    assert.ok(!removed.includes(`public-media/${replacementId}.webp`), "Current social icon must remain");
    assert.equal((await getImage()).status, 200);

    await saveContent("socials", { id, expectedVersion: 4, data: social }, db, storage);
    assert.equal((await getImage()).status, 404, "Switching back to a library icon clears custom media");
    await saveContent("socials", { id, expectedVersion: 5, data: { ...custom, customMediaId: replacementId, isPublished: true } }, db, storage);
    await client.query("UPDATE portfolio.social_links SET deleted_at=now(), is_published=false WHERE id=$1", [id]);
    assert.equal((await getImage()).status, 404);
    await reconcileCleanup(db);
    await client.exec("UPDATE portfolio.storage_cleanup_queue SET next_retry_at=now() WHERE completed_at IS NULL");
    await drainCleanup(100, db, storage);
    assert.ok(!removed.includes(`public-media/${replacementId}.webp`), "Soft-deleted icon stays protected during retention");
    await client.query("UPDATE portfolio.social_links SET deleted_at=now()-interval '8 days' WHERE id=$1", [id]);
    await reconcileCleanup(db);
    await drainCleanup(100, db, storage);
    assert.ok(removed.includes(`public-media/${replacementId}.webp`), "Expired trash releases its custom icon");
    assert.equal((await servePublicImage("social", "not-a-uuid", { db, storage })).status, 404);
    assert.equal((await servePublicImage("unknown", missingId, { db, storage })).status, 404);
  } finally {
    await client.close();
  }
});
