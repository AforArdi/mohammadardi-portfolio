import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { achievements, mediaAssets, profile, projects, skills, socialLinks } from "@/db/schema";
import { storageClient } from "./client";

type MediaReader = Pick<ReturnType<typeof getDb>, "select">;
type StorageReader = { from: (bucket: string) => { download: (path: string) => Promise<{ data: Blob | null; error: unknown }> } };

// One publication gate for all public images, including custom skill/social icons.
export async function servePublicImage(type: string, id: string, dependencies?: { db: MediaReader; storage: StorageReader }) {
  const db = dependencies?.db ?? getDb();
  let mediaId: string | null = null;
  if (type === "avatar" && id === "1") {
    mediaId = (await db.select({ value: profile.avatarMediaId }).from(profile).where(eq(profile.id, 1)))[0]?.value || null;
  } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const source = {
      project: { table: projects, column: projects.imageMediaId },
      achievement: { table: achievements, column: achievements.imageMediaId },
      skill: { table: skills, column: skills.customMediaId },
      social: { table: socialLinks, column: socialLinks.customMediaId },
    };
    if (Object.hasOwn(source, type)) {
      const { table, column } = source[type as keyof typeof source];
      mediaId = (await db.select({ value: column }).from(table).where(and(eq(table.id, id), eq(table.isPublished, true), isNull(table.deletedAt))))[0]?.value || null;
    }
  }
  const headers = { "Cache-Control": "no-store" };
  if (!mediaId) return new Response(null, { status: 404, headers });
  const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.mimeType, "image/webp")));
  if (!asset) return new Response(null, { status: 404, headers });
  const storage = dependencies?.storage ?? storageClient();
  const { data, error } = await storage.from(asset.bucketName).download(asset.storagePath);
  if (error || !data) return new Response(null, { status: 502, headers });
  return new Response(data, { headers: { ...headers, "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff" } });
}
