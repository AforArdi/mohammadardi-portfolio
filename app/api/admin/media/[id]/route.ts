import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireOwnerAdmin } from "@/lib/auth/guard";
import { storageClient } from "@/lib/storage/client";
import { apiError } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireOwnerAdmin();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
    const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, id));
    if (!asset) return new Response(null, { status: 404 });
    const { data, error } = await storageClient().from(asset.bucketName).download(asset.storagePath);
    if (error || !data) return new Response(null, { status: 502 });
    return new Response(data, { headers: { "Content-Type": asset.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
  } catch (error) { return apiError(error); }
}
