import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets, profile } from "@/db/schema";
import { storageClient } from "@/lib/storage/client";
import {
  buildResumeRateLimitInsert,
  buildResumeRateLimitUpdate,
  checkResumeRateLimits,
  deliverResume,
} from "@/lib/storage/resume";

export const dynamic = "force-dynamic";

export async function HEAD(request: Request) {
  return deliver(request, true).catch(unavailable);
}

export async function GET(request: Request) {
  return deliver(request, false).catch(unavailable);
}

function unavailable() {
  return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
}

async function deliver(request: Request, head: boolean) {
  const [asset] = await getDb()
    .select({
      bucket: mediaAssets.bucketName,
      path: mediaAssets.storagePath,
      size: mediaAssets.fileSizeBytes,
    })
    .from(profile)
    .innerJoin(mediaAssets, eq(profile.resumeMediaId, mediaAssets.id))
    .where(eq(profile.id, 1));

  const address = process.env.VERCEL
    ? (request.headers.get("x-vercel-forwarded-for") || "unknown").split(",")[0].trim()
    : "local";
  const download = new URL(request.url).searchParams.get("download") === "1";

  return deliverResume({
    asset,
    rangeHeader: request.headers.get("range"),
    head,
    download,
    secret: process.env.IP_HASH_SECRET,
    address,
    executeRateLimit: async (bytes, globalKey, clientKey, nextMonth) => {
      return getDb().transaction(async (tx) => {
        await tx.execute(buildResumeRateLimitInsert(globalKey, clientKey, nextMonth.toISOString()));
        const rows = await tx.execute(
          sql`SELECT key, count, bytes_served, expires_at FROM portfolio.rate_limit_buckets WHERE key IN (${globalKey},${clientKey}) ORDER BY key FOR UPDATE`
        );
        const ip = rows.find((row) => row.key === clientKey)!;
        const global = rows.find((row) => row.key === globalKey)!;
        const allowed = checkResumeRateLimits(
          ip as { count: number | string; expires_at: string },
          global as { bytes_served: number | string },
          bytes
        );
        if (!allowed) return false;

        const expired = new Date(ip.expires_at as string).getTime() <= Date.now();
        await tx.execute(
          sql`UPDATE portfolio.rate_limit_buckets SET bytes_served = bytes_served + ${bytes}, count = count + 1 WHERE key = ${globalKey}`
        );
        const newExpiry = (expired ? new Date(Date.now() + 600_000) : new Date(ip.expires_at as string)).toISOString();
        const newCount = expired ? 1 : Number(ip.count) + 1;
        await tx.execute(buildResumeRateLimitUpdate(clientKey, newCount, newExpiry));
        return true;
      });
    },
    downloadFromStorage: async (bucket, path) => {
      const { data, error } = await storageClient().from(bucket).download(path);
      return { data: data ? new Uint8Array(await data.arrayBuffer()) : null, error };
    },
  });
}
