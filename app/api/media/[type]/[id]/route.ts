import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { achievements, mediaAssets, profile, projects, skills } from "@/db/schema";
import { storageClient } from "@/lib/storage/client";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  let mediaId: string | null = null;
  if (type === "avatar" && id === "1") {
    const [owner] = await getDb().select({ mediaId: profile.avatarMediaId }).from(profile).where(eq(profile.id, 1));
    mediaId = owner?.mediaId || null;
  } else if (/^[0-9a-f-]{36}$/i.test(id)) {
    if (type === "project") mediaId = (await getDb().select({ value: projects.imageMediaId }).from(projects).where(and(eq(projects.id, id), eq(projects.isPublished, true), isNull(projects.deletedAt))))[0]?.value || null;
    if (type === "achievement") mediaId = (await getDb().select({ value: achievements.imageMediaId }).from(achievements).where(and(eq(achievements.id, id), eq(achievements.isPublished, true), isNull(achievements.deletedAt))))[0]?.value || null;
    if (type === "skill") mediaId = (await getDb().select({ value: skills.customMediaId }).from(skills).where(and(eq(skills.id, id), eq(skills.isPublished, true), isNull(skills.deletedAt))))[0]?.value || null;
  }
  if (!mediaId) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const [asset] = await getDb().select().from(mediaAssets).where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.mimeType, "image/webp")));
  if (!asset) return new Response(null, { status: 404 });
  const { data, error } = await storageClient().from(asset.bucketName).download(asset.storagePath);
  if (error || !data) return new Response(null, { status: 502 });
  return new Response(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
