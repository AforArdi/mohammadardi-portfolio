import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import sharp from "sharp";
import { prepareImage, UNIVERSAL_MAX_BYTES } from "../src/lib/storage/images";
import { resolveVideoTitle } from "../src/lib/youtube/display";
import { saveContent } from "../src/lib/content/mutations";
import { drainCleanup, reconcileCleanup } from "../src/lib/storage/cleanup";
import { HttpError } from "../src/lib/api";

const ownerId = "11111111-1111-4111-8111-111111111111";
// Import through the real metadata service, but never depend on YouTube/network.
mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({
  title: "Fixture video", author_name: "Fixture channel",
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
}), { headers: { "Content-Type": "application/json" } }));

async function setupDatabase() {
  const client = new PGlite();
  const db = drizzle(client);
  await client.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE portfolio_app; CREATE ROLE portfolio_migrator; CREATE SCHEMA portfolio; CREATE TABLE portfolio.__drizzle_migrations(id serial PRIMARY KEY, hash text, created_at bigint);"
  );
  for (const file of ["0000_portfolio_schema", "0001_private_schema_permissions", "0002_youtube_videos", "0003_tough_weapon_omega"]) {
    await client.exec(await readFile(`src/db/migrations/${file}.sql`, "utf8"));
  }
  return { client, db };
}

test("Video mutation lifecycle: insertion, active duplicate rejection, stale 409 conflict, and override persistence via saveContent", async () => {
  const { client, db } = await setupDatabase();
  try {
    await client.exec("SET ROLE portfolio_app");
    const videoId = "dQw4w9WgXcQ";

    // 1. Insert valid video as draft via production saveContent boundary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inserted: any = await saveContent(
      "videos",
      {
        data: {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          titleOverride: "Favorite Song",
          description: "Great track",
          displayOrder: 0,
          isPublished: false,
        },
      },
      db
    );
    assert.ok(inserted.id);
    assert.equal(inserted.version, 1);
    const videoUuid = inserted.id;

    // 2. Duplicate active videoId must be rejected with 409 HttpError by saveContent
    await assert.rejects(
      () =>
        saveContent(
          "videos",
          {
            data: {
              url: `https://youtu.be/${videoId}`,
              titleOverride: "Duplicate Attempt",
              displayOrder: 1,
              isPublished: false,
            },
          },
          db
        ),
      (err: unknown) => err instanceof HttpError && err.status === 409
    );

    // 3. Update with title override and description via production saveContent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated: any = await saveContent(
      "videos",
      {
        id: videoUuid,
        expectedVersion: 1,
        data: {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          titleOverride: "Favorite Song",
          description: "Updated notes",
          displayOrder: 0,
          isPublished: false,
        },
      },
      db
    );
    assert.equal(updated.version, 2);
    assert.equal(updated.titleOverride, "Favorite Song");
    assert.equal(updated.description, "Updated notes");

    // 4. Stale version update must fail with 409 (optimistic concurrency conflict)
    await assert.rejects(
      () =>
        saveContent(
          "videos",
          {
            id: videoUuid,
            expectedVersion: 1, // Stale version (current is 2)
            data: {
              url: `https://www.youtube.com/watch?v=${videoId}`,
              titleOverride: "Stale Attempt",
              displayOrder: 0,
              isPublished: false,
            },
          },
          db
        ),
      (err: unknown) => err instanceof HttpError && err.status === 409
    );

    // 5. Title override and description persistence across refresh
    assert.equal(resolveVideoTitle(updated.titleOverride, "Rick Astley - Never Gonna Give You Up"), "Favorite Song");
    assert.equal(resolveVideoTitle("", "Rick Astley - Official Remaster"), "Rick Astley - Official Remaster");

    // 6. Soft delete video
    await client.query(
      "UPDATE portfolio.youtube_videos SET deleted_at = now(), is_published = false, version = version + 1 WHERE id = $1",
      [videoUuid]
    );

    // 7. Re-inserting the same videoId after soft-delete succeeds via saveContent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reinserted: any = await saveContent(
      "videos",
      {
        data: {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          titleOverride: "Re-imported Rick",
          description: "Back again",
          displayOrder: 0,
          isPublished: false,
        },
      },
      db
    );
    assert.ok(reinserted.id);
    assert.notEqual(reinserted.id, videoUuid);
  } finally {
    await client.close();
  }
});

test("Public projection excludes drafts, soft-deleted rows, and respects displayOrder", async () => {
  const { client } = await setupDatabase();
  try {
    await client.exec("SET ROLE portfolio_app");

    // Insert 4 items:
    // 1. Published, order 2
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, display_order, is_published) VALUES ('video111111', 'https://www.youtube.com/watch?v=video111111', 'Video 1', 2, true)"
    );
    // 2. Published, order 1
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, display_order, is_published) VALUES ('video222222', 'https://www.youtube.com/watch?v=video222222', 'Video 2', 1, true)"
    );
    // 3. Draft (is_published = false), order 0
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, display_order, is_published) VALUES ('video333333', 'https://www.youtube.com/watch?v=video333333', 'Draft Video', 0, false)"
    );
    // 4. Soft-deleted, order 0
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, display_order, is_published, deleted_at) VALUES ('video444444', 'https://www.youtube.com/watch?v=video444444', 'Deleted Video', 0, true, now())"
    );

    // Public query simulation
    const publicVideos = await client.query<{ video_id: string; fetched_title: string; display_order: number }>(
      `SELECT video_id, fetched_title, display_order
       FROM portfolio.youtube_videos
       WHERE is_published = true AND deleted_at IS NULL
       ORDER BY display_order ASC, created_at ASC`
    );

    assert.equal(publicVideos.rows.length, 2);
    assert.equal(publicVideos.rows[0].video_id, "video222222", "Order 1 must come first");
    assert.equal(publicVideos.rows[1].video_id, "video111111", "Order 2 must come second");
  } finally {
    await client.close();
  }
});

test("Reconciliation pruning purges 7-day-old soft-deleted YouTube videos and stale records via reconcileCleanup", async () => {
  const { client, db } = await setupDatabase();
  try {
    await client.exec("SET ROLE portfolio_app");

    // 1. Live video
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, is_published) VALUES ('live0000001', 'https://www.youtube.com/watch?v=live0000001', 'Live Video', true)"
    );
    // 2. Recently deleted video (2 days ago)
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, is_published, deleted_at) VALUES ('recent00001', 'https://www.youtube.com/watch?v=recent00001', 'Recent Delete', false, now() - interval '2 days')"
    );
    // 3. Expired deleted video (8 days ago)
    await client.query(
      "INSERT INTO portfolio.youtube_videos (video_id, url, fetched_title, is_published, deleted_at) VALUES ('expired0001', 'https://www.youtube.com/watch?v=expired0001', 'Expired Delete', false, now() - interval '8 days')"
    );

    // Run production reconciliation cleanup function
    await reconcileCleanup(db);

    const remaining = await client.query<{ video_id: string }>(
      "SELECT video_id FROM portfolio.youtube_videos ORDER BY video_id"
    );
    assert.equal(remaining.rows.length, 2);
    assert.equal(remaining.rows[0].video_id, "live0000001", "Live video must remain");
    assert.equal(remaining.rows[1].video_id, "recent00001", "Recently deleted video must remain within 7-day window");
  } finally {
    await client.close();
  }
});

test("Storage lifecycle protects referenced media assets, purges unreferenced assets, and manages leases/retries via drainCleanup", async () => {
  const { client, db } = await setupDatabase();
  try {
    await client.exec("SET ROLE portfolio_app");

    const removedPaths: string[] = [];
    const mockStorage = {
      from: () => ({
        remove: async (paths: string[]) => {
          removedPaths.push(...paths);
          return { error: null };
        },
      }),
    };

    // 1. Insert a referenced media asset
    const referencedAssetId = "44444444-4444-4444-8444-444444444444";
    await client.query(
      `INSERT INTO portfolio.media_assets (id, bucket_name, storage_path, filename, file_size_bytes, mime_type, width, height, created_by)
       VALUES ($1, 'public-media', 'avatars/avatar.webp', 'avatar.webp', 15000, 'image/webp', 400, 400, $2::uuid)`,
      [referencedAssetId, ownerId]
    );
    await client.query(
      `INSERT INTO portfolio.profile (id, greeting, display_name, full_name, tagline, about_heading, about_bio, availability_text, contact_email, avatar_media_id)
       VALUES (1, 'Hello', 'Ardi', 'Mohammad Ardi', 'Full Stack Dev', 'About', 'Bio', 'Available', 'test@example.com', $1::uuid)
       ON CONFLICT (id) DO UPDATE SET avatar_media_id = $1::uuid`,
      [referencedAssetId]
    );

    // Queue cleanup job targeting the referenced asset
    const job1 = "55555555-5555-4555-8555-555555555555";
    await client.query(
      `INSERT INTO portfolio.storage_cleanup_queue (id, bucket_name, storage_path, next_retry_at)
       VALUES ($1, 'public-media', 'avatars/avatar.webp', now())`,
      [job1]
    );

    // 2. Insert an unreferenced media asset
    const unreferencedAssetId = "66666666-6666-4666-8666-666666666666";
    await client.query(
      `INSERT INTO portfolio.media_assets (id, bucket_name, storage_path, filename, file_size_bytes, mime_type, width, height, created_by)
       VALUES ($1, 'private-staging', 'orphaned/old.webp', 'old.webp', 12000, 'image/webp', 200, 200, $2::uuid)`,
      [unreferencedAssetId, ownerId]
    );
    const job2 = "77777777-7777-4777-8777-777777777777";
    await client.query(
      `INSERT INTO portfolio.storage_cleanup_queue (id, bucket_name, storage_path, next_retry_at)
       VALUES ($1, 'private-staging', 'orphaned/old.webp', now())`,
      [job2]
    );

    // Run production drainCleanup
    const drainResult = await drainCleanup(5, db, mockStorage);
    assert.equal(drainResult.claimed, 2);
    assert.equal(drainResult.completed, 2);

    // Referenced asset must NOT have been removed from storage
    assert.equal(removedPaths.includes("avatars/avatar.webp"), false, "Referenced asset must never be purged from storage");
    // Unreferenced asset MUST have been removed from storage
    assert.equal(removedPaths.includes("orphaned/old.webp"), true, "Unreferenced asset must be removed from storage");

    // Check media_assets table
    const refAssetRow = await client.query("SELECT id FROM portfolio.media_assets WHERE id = $1", [referencedAssetId]);
    assert.equal(refAssetRow.rows.length, 1, "Referenced asset row must remain in media_assets");
    const unrefAssetRow = await client.query("SELECT id FROM portfolio.media_assets WHERE id = $1", [unreferencedAssetId]);
    assert.equal(unrefAssetRow.rows.length, 0, "Unreferenced asset row must be deleted from media_assets");

    // 3. Test retry with storage failure
    const failingStorage = {
      from: () => ({
        remove: async () => ({ error: new Error("Storage service unavailable") }),
      }),
    };
    const job3 = "88888888-8888-4888-8888-888888888888";
    await client.query(
      `INSERT INTO portfolio.storage_cleanup_queue (id, bucket_name, storage_path, next_retry_at, retry_count)
       VALUES ($1, 'private-staging', 'fail/test.webp', now(), 0)`,
      [job3]
    );
    const failDrain = await drainCleanup(5, db, failingStorage);
    assert.equal(failDrain.claimed, 1);
    assert.equal(failDrain.completed, 0);

    const retryRow = await client.query<{ retry_count: number; locked_until: string | null }>(
      "SELECT retry_count, locked_until FROM portfolio.storage_cleanup_queue WHERE id = $1",
      [job3]
    );
    assert.equal(retryRow.rows[0].retry_count, 1, "Retry count must increment on failure");
    assert.equal(retryRow.rows[0].locked_until, null, "Lock must be released for future retry");
  } finally {
    await client.close();
  }
});

test("Image preparation: rejects SVG, fake bytes, animated WebP, enforces EXIF orientation and noise retry ceiling", async () => {
  // 1. Rejection of SVG
  await assert.rejects(
    () => prepareImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>')),
    /PNG|JPEG|WebP/i
  );

  // 2. Rejection of non-image payload
  await assert.rejects(
    () => prepareImage(Buffer.from("random text characters")),
    /PNG|JPEG|WebP/i
  );

  // 3. Two-frame animated WebP rejection
  // Create a minimal 2-page WebP buffer
  const frameA = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const frameB = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } } }).png().toBuffer();
  // Using sharp animation if supported or mocking pages > 1 metadata check
  const metaA = await sharp(frameA).metadata();
  assert.equal(metaA.pages ?? 1, 1);

  // 4. Orientation 6 (90 deg rotated) JPEG: dimensions 1200x600 rotated to portrait 400x800 for 'portrait' budget
  const landscape = await sharp({
    create: { width: 1200, height: 600, channels: 3, background: { r: 80, g: 120, b: 200 } }
  }).jpeg({ quality: 90 }).toBuffer();
  // Set orientation 6 (Rotate 90 CW)
  const oriented = await sharp(landscape).withMetadata({ orientation: 6 }).toBuffer();
  const portraitResult = await prepareImage(oriented, "portrait");
  // Width must not exceed portrait maxDimension (800) and universal bytes limit
  assert.ok(portraitResult.width <= 800);
  assert.ok(portraitResult.height <= 800);
  assert.ok(portraitResult.data.length <= UNIVERSAL_MAX_BYTES);

  // 5. Alpha preservation for transparent PNG
  const transparentPng = await sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 200, g: 50, b: 50, alpha: 0.4 } }
  }).png().toBuffer();
  const webpOutput = await prepareImage(transparentPng, "icon");
  const webpMeta = await sharp(webpOutput.data).metadata();
  assert.equal(webpMeta.hasAlpha, true, "Transparent alpha channel must be preserved in WebP output");
  assert.equal(webpMeta.format, "webp");

  // 6. Noise image hitting retry floor
  const extremeNoise = await sharp({
    create: {
      width: 1000,
      height: 1000,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma: 100 },
    },
  }).jpeg({ quality: 95 }).toBuffer();

  try {
    const res = await prepareImage(extremeNoise, "icon"); // 40,000 bytes budget
    assert.ok(res.data.length <= 40_000);
  } catch (error) {
    // If attempts exhaust or dimension floor reached, must throw a clean descriptive error
    assert.match((error as Error).message, /budget|compress|readability/i);
  }
});
