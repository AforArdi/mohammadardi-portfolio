import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import { mediaAssets, storageCleanupQueue } from "@/db/schema";
import { requireOwnerAdmin } from "@/lib/auth/guard";
import { storageClient } from "@/lib/storage/client";
import { MAX_FILE_BYTES, prepareImage } from "@/lib/storage/images";
import { apiError, assertSameOrigin, boundedBody, HttpError } from "@/lib/api";
import { reserveRateLimit } from "@/lib/auth/queries";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const owner = await requireOwnerAdmin();
    const allowed = await getDb().execute(reserveRateLimit(`upload:${owner.userId}`, 40, 3600));
    if (!allowed.length) throw new HttpError(429, "Upload limit reached. Please try again in an hour.");
    const body = await boundedBody(request, 4_000_000);
    const form = await new Response(new Uint8Array(body), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || !["image", "resume"].includes(String(kind)) || file.size > MAX_FILE_BYTES || file.size === 0) throw new HttpError(400, "Choose one PNG, JPEG, WebP, or PDF up to 3.5 MB.");
    let data = Buffer.from(await file.arrayBuffer());
    let width: number | null = null, height: number | null = null;
    const pdf = kind === "resume";
    if (pdf) {
      if (data.subarray(0, 5).toString("ascii") !== "%PDF-" || !/\.pdf$/i.test(file.name)) throw new HttpError(400, "Choose a valid PDF resume.");
    } else {
      try { const image = await prepareImage(data); data = Buffer.from(image.data); width = image.width; height = image.height; }
      catch { throw new HttpError(400, "That image could not be processed. Use a PNG, JPEG, or WebP under 24 megapixels."); }
    }
    const id = randomUUID();
    const bucketName = pdf ? "private-documents" : "private-staging";
    const storagePath = `${id}.${pdf ? "pdf" : "webp"}`;
    // A durable cleanup entry exists before the network upload, including if the worker dies afterward.
    const [cleanup] = await getDb().insert(storageCleanupQueue).values({ bucketName, storagePath, nextRetryAt: new Date(Date.now() + 86_400_000) }).returning({ id: storageCleanupQueue.id });
    const { error } = await storageClient().from(bucketName).upload(storagePath, data, { contentType: pdf ? "application/pdf" : "image/webp", upsert: false });
    if (error) throw new HttpError(502, "Upload failed. Please try again.");
    await getDb().insert(mediaAssets).values({ id, bucketName, storagePath, filename: file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 150), mimeType: pdf ? "application/pdf" : "image/webp", fileSizeBytes: data.length, width, height, createdBy: owner.userId });
    // Cleanup workers retain assets referenced by content and remove abandoned uploads after 24 hours.
    return Response.json({ id, previewUrl: `/api/admin/media/${id}`, cleanupId: cleanup.id });
  } catch (error) { return apiError(error); }
}
