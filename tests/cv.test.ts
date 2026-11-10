import assert from "node:assert/strict";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import {
  RESUME_FILENAME,
  RESUME_IP_LIMIT,
  RESUME_GLOBAL_BYTE_LIMIT,
  buildResumeHeaders,
  buildResumeRateLimitInsert,
  buildResumeRateLimitUpdate,
  checkResumeRateLimits,
  deliverResume,
} from "../src/lib/storage/resume";

const secret = "test-ip-hash-secret-value-32-chars-long";
const samplePdf = Buffer.concat([
  Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"),
  Buffer.alloc(950, 0x20),
]);
const assetSize = samplePdf.length; // ~1000 bytes

test("CV headers enforce exact filename 'Mohammad-Ardi-Resume.pdf' for download and inline preview", () => {
  const fullRange = { start: 0, end: assetSize - 1, partial: false };
  const downloadHeaders = buildResumeHeaders({ range: fullRange, assetSize, download: true });
  assert.equal(downloadHeaders["Content-Disposition"], `attachment; filename="${RESUME_FILENAME}"`);
  assert.equal(downloadHeaders["Content-Type"], "application/pdf");
  assert.equal(downloadHeaders["Content-Length"], String(assetSize));
  assert.equal(downloadHeaders["X-Content-Type-Options"], "nosniff");
  assert.equal(downloadHeaders["Content-Security-Policy"], "sandbox");
  assert.equal(downloadHeaders["Cache-Control"], "no-store");
  assert.equal(downloadHeaders["Content-Range"], undefined);

  const previewHeaders = buildResumeHeaders({ range: fullRange, assetSize, download: false });
  assert.equal(previewHeaders["Content-Disposition"], `inline; filename="${RESUME_FILENAME}"`);
  assert.equal(previewHeaders["Content-Range"], undefined);

  const partialRange = { start: 100, end: 299, partial: true };
  const partialHeaders = buildResumeHeaders({ range: partialRange, assetSize, download: false });
  assert.equal(partialHeaders["Content-Range"], `bytes 100-299/${assetSize}`);
  assert.equal(partialHeaders["Content-Length"], "200");
});

test("CV delivery handles full range, suffix range, open-ended range and 416 invalid ranges", async () => {
  let downloadCount = 0;
  const mockStorage = async () => {
    downloadCount++;
    return { data: new Uint8Array(samplePdf), error: null };
  };
  const allowRateLimit = async () => true;
  const asset = { bucket: "private-cv", path: "resume.pdf", size: assetSize };

  // 1. Full GET (no Range header)
  downloadCount = 0;
  const resFull = await deliverResume({
    asset,
    rangeHeader: null,
    head: false,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: mockStorage,
  });
  assert.equal(resFull.status, 200);
  assert.equal(resFull.headers.get("content-type"), "application/pdf");
  assert.equal(resFull.headers.get("content-length"), String(assetSize));
  assert.equal(downloadCount, 1);
  const fullBytes = Buffer.from(await resFull.arrayBuffer());
  assert.equal(fullBytes.length, assetSize);
  assert.equal(fullBytes.subarray(0, 5).toString("ascii"), "%PDF-");

  // 2. Suffix range: bytes=-200
  downloadCount = 0;
  const resSuffix = await deliverResume({
    asset,
    rangeHeader: "bytes=-200",
    head: false,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: mockStorage,
  });
  assert.equal(resSuffix.status, 206);
  assert.equal(resSuffix.headers.get("content-length"), "200");
  assert.equal(resSuffix.headers.get("content-range"), `bytes ${assetSize - 200}-${assetSize - 1}/${assetSize}`);
  const suffixBytes = Buffer.from(await resSuffix.arrayBuffer());
  assert.equal(suffixBytes.length, 200);

  // 3. Open-ended range: bytes=100-
  downloadCount = 0;
  const resOpen = await deliverResume({
    asset,
    rangeHeader: "bytes=100-",
    head: false,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: mockStorage,
  });
  assert.equal(resOpen.status, 206);
  assert.equal(resOpen.headers.get("content-length"), String(assetSize - 100));
  assert.equal(resOpen.headers.get("content-range"), `bytes 100-${assetSize - 1}/${assetSize}`);

  // 4. Invalid range: bytes=99999- returns 416
  const resInvalid = await deliverResume({
    asset,
    rangeHeader: "bytes=99999-",
    head: false,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: mockStorage,
  });
  assert.equal(resInvalid.status, 416);
  assert.equal(resInvalid.headers.get("content-range"), `bytes */${assetSize}`);
});

test("CV HEAD requests perform ZERO storage downloads and return accurate Content-Length", async () => {
  let downloadCount = 0;
  const mockStorage = async () => {
    downloadCount++;
    return { data: new Uint8Array(samplePdf), error: null };
  };
  const allowRateLimit = async () => true;
  const asset = { bucket: "private-cv", path: "resume.pdf", size: assetSize };

  // Full HEAD
  const resHead = await deliverResume({
    asset,
    rangeHeader: null,
    head: true,
    download: true,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: mockStorage,
  });
  assert.equal(resHead.status, 200);
  assert.equal(resHead.headers.get("content-length"), String(assetSize));
  assert.equal(resHead.headers.get("content-disposition"), `attachment; filename="${RESUME_FILENAME}"`);
  assert.equal(downloadCount, 0, "HEAD request MUST NEVER trigger storage download");

  // Partial HEAD
  const resHeadRange = await deliverResume({
    asset,
    rangeHeader: "bytes=-1",
    head: true,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: mockStorage,
  });
  assert.equal(resHeadRange.status, 206);
  assert.equal(resHeadRange.headers.get("content-length"), "1");
  assert.equal(resHeadRange.headers.get("content-range"), `bytes ${assetSize - 1}-${assetSize - 1}/${assetSize}`);
  assert.equal(downloadCount, 0, "Partial HEAD request MUST NEVER trigger storage download");
});

test("CV delivery handles absent CV, missing secret and upstream storage failures gracefully", async () => {
  const allowRateLimit = async () => true;

  // 1. Missing secret
  const resNoSecret = await deliverResume({
    asset: { bucket: "b", path: "p", size: 100 },
    rangeHeader: null,
    head: false,
    download: false,
    secret: undefined,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: async () => ({ data: null, error: null }),
  });
  assert.equal(resNoSecret.status, 503);

  // 2. Absent CV (null asset)
  const resNoAsset = await deliverResume({
    asset: null,
    rangeHeader: null,
    head: false,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: async () => ({ data: null, error: null }),
  });
  assert.equal(resNoAsset.status, 404);
  assert.equal(resNoAsset.headers.get("cache-control"), "no-store");

  // 3. Storage failure
  const resStorageError = await deliverResume({
    asset: { bucket: "b", path: "p", size: 100 },
    rangeHeader: null,
    head: false,
    download: false,
    secret,
    address: "127.0.0.1",
    executeRateLimit: allowRateLimit,
    downloadFromStorage: async () => ({ data: null, error: new Error("Storage unreachable") }),
  });
  assert.equal(resStorageError.status, 502);
  assert.equal(resStorageError.headers.get("cache-control"), "no-store");
});

test("CV rate limits enforce IP cap, monthly 5GB quota, and handle month rollover cleanly", async () => {
  const now = new Date("2026-11-10T12:00:00.000Z");
  const nowMs = now.getTime();

  // 1. IP under limit
  assert.equal(
    checkResumeRateLimits({ count: 59, expires_at: new Date(nowMs + 60_000).toISOString() }, { bytes_served: 0 }, 1000, nowMs),
    true
  );

  // 2. IP exhausted (60 requests)
  assert.equal(
    checkResumeRateLimits({ count: RESUME_IP_LIMIT, expires_at: new Date(nowMs + 60_000).toISOString() }, { bytes_served: 0 }, 1000, nowMs),
    false
  );

  // 3. IP expired window resets count allowance
  assert.equal(
    checkResumeRateLimits({ count: RESUME_IP_LIMIT, expires_at: new Date(nowMs - 1000).toISOString() }, { bytes_served: 0 }, 1000, nowMs),
    true
  );

  // 4. Monthly byte quota exhausted (5 GB)
  assert.equal(
    checkResumeRateLimits({ count: 1, expires_at: new Date(nowMs + 60_000).toISOString() }, { bytes_served: RESUME_GLOBAL_BYTE_LIMIT }, 1, nowMs),
    false
  );

  // 5. Month rollover key construction
  const monthNov = now.toISOString().slice(0, 7);
  assert.equal(monthNov, "2026-11");
  const nextMonthDec = new Date(now);
  nextMonthDec.setUTCMonth(nextMonthDec.getUTCMonth() + 1, 1);
  nextMonthDec.setUTCHours(0, 0, 0, 0);
  assert.equal(nextMonthDec.toISOString(), "2026-12-01T00:00:00.000Z");

  // In December, key is resume-month:2026-12; previous November usage does not affect it
  const decDate = new Date("2026-12-01T00:00:01.000Z");
  const monthDec = decDate.toISOString().slice(0, 7);
  assert.equal(monthDec, "2026-12");

  // 6. Rejected rate limit returns 429 with Retry-After 600
  const denyRateLimit = async () => false;
  const res429 = await deliverResume({
    asset: { bucket: "b", path: "p", size: 100 },
    rangeHeader: null,
    head: false,
    download: true,
    secret,
    address: "127.0.0.1",
    executeRateLimit: denyRateLimit,
    downloadFromStorage: async () => ({ data: new Uint8Array([1]), error: null }),
  });
  assert.equal(res429.status, 429);
  assert.equal(res429.headers.get("retry-after"), "600");
  assert.equal(res429.headers.get("cache-control"), "no-store");
});

test("PGlite Postgres driver timestamp serialization regression verifies ISO string with timestamptz cast", async () => {
  const client = new PGlite();
  const db = drizzle(client);

  try {
    await client.exec("CREATE SCHEMA portfolio;");
    await client.exec(`
      CREATE TABLE portfolio.rate_limit_buckets (
        key text PRIMARY KEY,
        count integer DEFAULT 0 NOT NULL,
        bytes_served bigint DEFAULT 0 NOT NULL,
        expires_at timestamptz NOT NULL
      );
    `);

    // Verify raw Date value prevention: passing non-string throws TypeError before reaching SQL
    assert.throws(
      // @ts-expect-error Testing invalid parameter
      () => buildResumeRateLimitInsert("global-key", "client-key", new Date()),
      /TypeError: nextMonthIso must be an ISO timestamp string/
    );

    // Verify valid ISO string query execution
    const nextMonthIso = "2026-12-01T00:00:00.000Z";
    const insertSql = buildResumeRateLimitInsert("resume-month:2026-11", "resume-ip:test-hash", nextMonthIso);
    await db.execute(insertSql);

    const rows = await client.query<{ key: string; count: number; expires_at: string }>(
      "SELECT key, count, expires_at FROM portfolio.rate_limit_buckets ORDER BY key"
    );
    assert.equal(rows.rows.length, 2);

    // Verify update query with ISO timestamp
    const updateExpiry = new Date(Date.now() + 600_000).toISOString();
    const updateSql = buildResumeRateLimitUpdate("resume-ip:test-hash", 2, updateExpiry);
    await db.execute(updateSql);

    const updated = await client.query<{ count: number }>(
      "SELECT count FROM portfolio.rate_limit_buckets WHERE key = 'resume-ip:test-hash'"
    );
    assert.equal(updated.rows[0].count, 2);
  } finally {
    await client.close();
  }
});

test("Download after preview regression: buffer slicing protects cached buffer from detachment, and verifies Mohammad-Ardi-Resume.pdf filename", async () => {
  // 1. Simulate the fetch response returning an ArrayBuffer
  const originalBuffer = samplePdf.buffer.slice(samplePdf.byteOffset, samplePdf.byteOffset + samplePdf.byteLength);
  assert.equal(originalBuffer.byteLength, assetSize);

  // 2. Simulate preview worker transfer:
  // When PdfPreview passes `new Uint8Array(buffer.slice(0))` to getDocument,
  // the sliced copy is transferred, leaving originalBuffer intact.
  const previewData = new Uint8Array(originalBuffer.slice(0));
  assert.equal(previewData.byteLength, assetSize);

  // Simulate a worker transfer on previewData by transferring its buffer via MessageChannel
  const { MessageChannel } = await import("node:worker_threads");
  const { port1, port2 } = new MessageChannel();
  port1.postMessage(previewData.buffer, [previewData.buffer]);
  port2.close();
  port1.close();

  // The transferred slice buffer is detached:
  assert.equal(previewData.buffer.byteLength, 0, "Transferred buffer slice must be detached by worker");

  // CRITICAL REGRESSION: The original cached buffer MUST NOT be detached!
  assert.equal(originalBuffer.byteLength, assetSize, "Original cached buffer must remain intact after preview transfer");

  // 3. Verify the intact buffer can be converted to Blob for download as Mohammad-Ardi-Resume.pdf
  const downloadBlob = new Blob([originalBuffer], { type: "application/pdf" });
  assert.equal(downloadBlob.size, assetSize);
  const blobBytes = new Uint8Array(await downloadBlob.arrayBuffer());
  assert.equal(new TextDecoder().decode(blobBytes.slice(0, 5)), "%PDF-");

  // 4. Verify exact resume download filename contract in both download and inline preview modes
  assert.equal(RESUME_FILENAME, "Mohammad-Ardi-Resume.pdf");
  const downloadHeaders = buildResumeHeaders({
    range: { start: 0, end: assetSize - 1, partial: false },
    assetSize,
    download: true,
  });
  assert.equal(downloadHeaders["Content-Disposition"], 'attachment; filename="Mohammad-Ardi-Resume.pdf"');

  const previewHeaders = buildResumeHeaders({
    range: { start: 0, end: assetSize - 1, partial: false },
    assetSize,
    download: false,
  });
  assert.equal(previewHeaders["Content-Disposition"], 'inline; filename="Mohammad-Ardi-Resume.pdf"');
});
