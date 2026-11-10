import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { parseByteRange } from "./range";

export const RESUME_FILENAME = "Mohammad-Ardi-Resume.pdf";
export const RESUME_IP_LIMIT = 60;
export const RESUME_GLOBAL_BYTE_LIMIT = 5_000_000_000; // 5 GB

export interface ResumeRange {
  start: number;
  end: number;
  partial: boolean;
}

export function buildResumeHeaders(options: {
  range: ResumeRange;
  assetSize: number;
  download?: boolean;
}): Record<string, string> {
  const { range, assetSize, download } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Length": String(range.end - range.start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${RESUME_FILENAME}"`,
  };
  if (range.partial) {
    headers["Content-Range"] = `bytes ${range.start}-${range.end}/${assetSize}`;
  }
  return headers;
}

export function buildResumeRateLimitInsert(globalKey: string, clientKey: string, nextMonthIso: string) {
  if (typeof nextMonthIso !== "string" || isNaN(Date.parse(nextMonthIso))) {
    throw new TypeError("nextMonthIso must be an ISO timestamp string");
  }
  return sql`INSERT INTO portfolio.rate_limit_buckets (key, count, bytes_served, expires_at) VALUES
    (${globalKey},0,0,${nextMonthIso}::timestamptz), (${clientKey},0,0,now() + interval '10 minutes') ON CONFLICT DO NOTHING`;
}

export function buildResumeRateLimitUpdate(clientKey: string, count: number, expiresAtIso: string) {
  if (typeof expiresAtIso !== "string" || isNaN(Date.parse(expiresAtIso))) {
    throw new TypeError("expiresAtIso must be an ISO timestamp string");
  }
  return sql`UPDATE portfolio.rate_limit_buckets SET count = ${count}, expires_at = ${expiresAtIso}::timestamptz WHERE key = ${clientKey}`;
}

export function checkResumeRateLimits(
  ip: { count: number | string; expires_at: string | Date },
  global: { bytes_served: number | string },
  bytes: number,
  nowMs: number = Date.now()
): boolean {
  const expiresAtMs = new Date(ip.expires_at).getTime();
  const expired = expiresAtMs <= nowMs;
  if (!expired && Number(ip.count) >= RESUME_IP_LIMIT) return false;
  if (Number(global.bytes_served) + bytes > RESUME_GLOBAL_BYTE_LIMIT) return false;
  return true;
}

export interface DeliverResumeOptions {
  asset: { bucket: string; path: string; size: number } | null | undefined;
  rangeHeader: string | null;
  head: boolean;
  download: boolean;
  secret: string | undefined;
  address: string;
  now?: Date;
  executeRateLimit: (bytes: number, globalKey: string, clientKey: string, nextMonth: Date) => Promise<boolean>;
  downloadFromStorage: (bucket: string, path: string) => Promise<{ data: Uint8Array | null; error: unknown }>;
}

export async function deliverResume(options: DeliverResumeOptions): Promise<Response> {
  const {
    asset,
    rangeHeader,
    head,
    download,
    secret,
    address,
    now = new Date(),
    executeRateLimit,
    downloadFromStorage,
  } = options;

  if (!secret) return new Response(null, { status: 503 });
  if (!asset) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const range = parseByteRange(rangeHeader, asset.size);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${asset.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" },
    });
  }

  const bytes = head ? 0 : range.end - range.start + 1;
  const clientKey = `resume-ip:${createHmac("sha256", secret).update(address).digest("hex")}`;
  const month = now.toISOString().slice(0, 7);
  const nextMonth = new Date(now);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
  nextMonth.setUTCHours(0, 0, 0, 0);
  const globalKey = `resume-month:${month}`;

  const allowed = await executeRateLimit(bytes, globalKey, clientKey, nextMonth);
  if (!allowed) {
    return new Response(null, { status: 429, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });
  }

  const headers = buildResumeHeaders({ range, assetSize: asset.size, download });
  if (head) {
    return new Response(null, { status: range.partial ? 206 : 200, headers });
  }

  const { data, error } = await downloadFromStorage(asset.bucket, asset.path);
  if (error || !data) {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return new Response(data.slice(range.start, range.end + 1), {
    status: range.partial ? 206 : 200,
    headers,
  });
}
