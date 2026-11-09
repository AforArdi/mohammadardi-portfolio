import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets, profile } from "@/db/schema";
import { storageClient } from "@/lib/storage/client";
import { parseByteRange } from "@/lib/storage/range";

export const dynamic = "force-dynamic";
export async function HEAD(request: Request) { return deliver(request, true); }
export async function GET(request: Request) { return deliver(request, false); }
async function deliver(request: Request, head: boolean) {
  const [asset] = await getDb().select({ bucket: mediaAssets.bucketName, path: mediaAssets.storagePath, size: mediaAssets.fileSizeBytes }).from(profile).innerJoin(mediaAssets, eq(profile.resumeMediaId, mediaAssets.id)).where(eq(profile.id, 1));
  if (!asset) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const range = parseByteRange(request.headers.get("range"), asset.size);
  if (!range) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${asset.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" } });
  const bytes = head ? 0 : range.end - range.start + 1;
  const address = process.env.VERCEL ? (request.headers.get("x-vercel-forwarded-for") || "unknown").split(",")[0].trim() : "local";
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  const clientKey = `resume-ip:${createHmac("sha256", secret).update(address).digest("hex")}`;
  const month = new Date().toISOString().slice(0, 7);
  const nextMonth = new Date(); nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1); nextMonth.setUTCHours(0, 0, 0, 0);
  const globalKey = `resume-month:${month}`;
  const allowed = await getDb().transaction(async tx => {
    await tx.execute(sql`INSERT INTO portfolio.rate_limit_buckets (key, count, bytes_served, expires_at) VALUES
      (${globalKey},0,0,${nextMonth}), (${clientKey},0,0,now() + interval '10 minutes') ON CONFLICT DO NOTHING`);
    const rows = await tx.execute(sql`SELECT key, count, bytes_served, expires_at FROM portfolio.rate_limit_buckets WHERE key IN (${globalKey},${clientKey}) ORDER BY key FOR UPDATE`);
    const ip = rows.find(row => row.key === clientKey)!;
    const global = rows.find(row => row.key === globalKey)!;
    const expired = new Date(ip.expires_at as string).getTime() <= Date.now();
    if ((!expired && Number(ip.count) >= 60) || Number(global.bytes_served) + bytes > 5_000_000_000) return false;
    await tx.execute(sql`UPDATE portfolio.rate_limit_buckets SET bytes_served = bytes_served + ${bytes}, count = count + 1 WHERE key = ${globalKey}`);
    await tx.execute(sql`UPDATE portfolio.rate_limit_buckets SET count = ${expired ? 1 : Number(ip.count) + 1}, expires_at = ${expired ? new Date(Date.now() + 600_000) : new Date(ip.expires_at as string)} WHERE key = ${clientKey}`);
    return true;
  });
  if (!allowed) return new Response(null, { status: 429, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf", "Content-Length": String(range.end - range.start + 1), "Accept-Ranges": "bytes",
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
    "Content-Disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="Ardi-Resume.pdf"`,
  };
  if (range.partial) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${asset.size}`;
  if (head) return new Response(null, { status: range.partial ? 206 : 200, headers });
  const { data, error } = await storageClient().from(asset.bucket).download(asset.path);
  if (error || !data) return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  return new Response(data.slice(range.start, range.end + 1), { status: range.partial ? 206 : 200, headers });
}
