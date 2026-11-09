import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { storageClient } from "./client";

export async function drainCleanup(limit = 5) {
  const db = getDb();
  const jobs = await db.execute(sql`UPDATE portfolio.storage_cleanup_queue SET locked_until = now() + interval '2 minutes'
    WHERE id IN (SELECT id FROM portfolio.storage_cleanup_queue WHERE completed_at IS NULL AND next_retry_at <= now()
      AND (locked_until IS NULL OR locked_until < now()) ORDER BY next_retry_at LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING id, bucket_name, storage_path, retry_count`);
  let completed = 0;
  for (const job of jobs) {
    try {
      await db.transaction(async tx => {
        const assets = await tx.execute(sql`SELECT id FROM portfolio.media_assets WHERE bucket_name = ${job.bucket_name} AND storage_path = ${job.storage_path} FOR UPDATE`);
        const assetId = assets[0]?.id;
        if (assetId) {
          const refs = await tx.execute(sql`SELECT 1 FROM portfolio.profile WHERE avatar_media_id = ${assetId}::uuid OR resume_media_id = ${assetId}::uuid
            UNION ALL SELECT 1 FROM portfolio.projects WHERE image_media_id = ${assetId}::uuid
            UNION ALL SELECT 1 FROM portfolio.achievements WHERE image_media_id = ${assetId}::uuid
            UNION ALL SELECT 1 FROM portfolio.skills WHERE custom_media_id = ${assetId}::uuid LIMIT 1`);
          if (refs.length) { await tx.execute(sql`UPDATE portfolio.storage_cleanup_queue SET completed_at = now(), locked_until = NULL WHERE id = ${job.id}::uuid`); return; }
        }
        const { error } = await storageClient().from(String(job.bucket_name)).remove([String(job.storage_path)]);
        if (error) throw error;
        if (assetId) await tx.execute(sql`DELETE FROM portfolio.media_assets WHERE id = ${assetId}::uuid`);
        await tx.execute(sql`UPDATE portfolio.storage_cleanup_queue SET completed_at = now(), locked_until = NULL WHERE id = ${job.id}::uuid`);
      });
      completed++;
    } catch {
      const delay = Math.min(86_400, 60 * 2 ** Math.min(10, Number(job.retry_count)));
      await db.execute(sql`UPDATE portfolio.storage_cleanup_queue SET retry_count = retry_count + 1, locked_until = NULL, next_retry_at = now() + ${delay} * interval '1 second' WHERE id = ${job.id}::uuid`);
    }
  }
  return { claimed: jobs.length, completed };
}

export async function reconcileCleanup() {
  const db = getDb();
  // Trash retention gives a seven-day recovery window before physical deletion.
  await db.execute(sql`DELETE FROM portfolio.projects WHERE deleted_at < now() - interval '7 days'`);
  await db.execute(sql`DELETE FROM portfolio.achievements WHERE deleted_at < now() - interval '7 days'`);
  await db.execute(sql`DELETE FROM portfolio.skills WHERE deleted_at < now() - interval '7 days'`);
  await db.execute(sql`DELETE FROM portfolio.social_links WHERE deleted_at < now() - interval '7 days'`);
  await db.execute(sql`INSERT INTO portfolio.storage_cleanup_queue (bucket_name, storage_path)
    SELECT m.bucket_name, m.storage_path FROM portfolio.media_assets m WHERE m.created_at < now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM portfolio.profile p WHERE p.avatar_media_id=m.id OR p.resume_media_id=m.id)
      AND NOT EXISTS (SELECT 1 FROM portfolio.projects p WHERE p.image_media_id=m.id)
      AND NOT EXISTS (SELECT 1 FROM portfolio.achievements a WHERE a.image_media_id=m.id)
      AND NOT EXISTS (SELECT 1 FROM portfolio.skills s WHERE s.custom_media_id=m.id)
      AND NOT EXISTS (SELECT 1 FROM portfolio.storage_cleanup_queue q WHERE q.bucket_name=m.bucket_name AND q.storage_path=m.storage_path AND q.completed_at IS NULL) LIMIT 100`);
  await db.execute(sql`DELETE FROM portfolio.rate_limit_buckets WHERE expires_at < now() - interval '1 day'`);
  await db.execute(sql`DELETE FROM portfolio.fresh_login_nonces WHERE expires_at < now() - interval '1 day'`);
  await db.execute(sql`DELETE FROM portfolio.admin_sessions WHERE deadline_at < now() - interval '7 days'`);
  await db.execute(sql`DELETE FROM portfolio.storage_cleanup_queue WHERE completed_at < now() - interval '7 days'`);
}
