import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDb } from "@/db";
import { achievements, mediaAssets, profile, projects, skills, socialLinks, storageCleanupQueue, youtubeVideos } from "@/db/schema";
import { HttpError } from "@/lib/api";
import { storageClient } from "@/lib/storage/client";
import { iconRegistry } from "./icons";
import { achievementInput, mutationInput, profileInput, projectInput, skillInput, socialInput, videoInput } from "./validation";
import { fetchYouTubeMetadata, parseYouTubeUrl } from "@/lib/youtube/service";

export const collections = ["skills", "projects", "achievements", "socials", "videos"] as const;
export type Collection = typeof collections[number];
export const collectionTables = { skills, projects, achievements, socials: socialLinks, videos: youtubeVideos };

function changed<T>(rows: T[]) {
  if (!rows.length) throw new HttpError(409, "This item changed in another tab. Refresh before saving again.");
  return rows[0];
}
export function invalidatePortfolio() { revalidateTag("portfolio-content"); revalidatePath("/"); }

async function checkMedia(id: string | null, kind: "image" | "pdf", publish: boolean) {
  if (!id) return;
  const [asset] = await getDb().select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!asset || (kind === "pdf" ? asset.mimeType !== "application/pdf" : asset.mimeType !== "image/webp")) throw new HttpError(400, "Choose a valid uploaded file.");
  if (publish && asset.bucketName === "private-staging") {
    // Both object locations are queued before the copy. Reference checks protect active assets.
    await getDb().insert(storageCleanupQueue).values({ bucketName: "public-media", storagePath: asset.storagePath, nextRetryAt: new Date(Date.now() + 86_400_000) });
    const storage = storageClient();
    const { data, error } = await storage.from("private-staging").download(asset.storagePath);
    if (error || !data) throw new HttpError(502, "Image could not be published. Try again.");
    const uploaded = await storage.from("public-media").upload(asset.storagePath, data, { contentType: "image/webp", upsert: false });
    if (uploaded.error && !uploaded.error.message.toLowerCase().includes("already exists")) throw new HttpError(502, "Image could not be published. Try again.");
    await getDb().update(mediaAssets).set({ bucketName: "public-media" }).where(and(eq(mediaAssets.id, id), eq(mediaAssets.bucketName, "private-staging")));
    await getDb().insert(storageCleanupQueue).values({ bucketName: "private-staging", storagePath: asset.storagePath });
  }
}
function checkIcon(key: string | null, provider?: string) {
  if (!key || !Object.hasOwn(iconRegistry, key) || (provider && !key.startsWith(`${provider}:`))) throw new HttpError(400, "Choose an icon from the library.");
}

export async function saveContent(collection: string, input: unknown) {
  const { id, expectedVersion, data } = mutationInput.parse(input);
  const db = getDb();
  if (collection === "profile") {
    if (!expectedVersion) throw new HttpError(400, "Profile version is required.");
    const value = profileInput.parse(data);
    await checkMedia(value.avatarMediaId, "image", true);
    await checkMedia(value.resumeMediaId, "pdf", false);
    return changed(await db.update(profile).set({ ...value, version: sql`${profile.version} + 1`, updatedAt: new Date() }).where(and(eq(profile.id, 1), eq(profile.version, expectedVersion))).returning());
  }
  if (collection === "skills") {
    const value = skillInput.parse(data);
    if (value.iconProvider !== "custom") checkIcon(value.iconKey, value.iconProvider);
    await checkMedia(value.customMediaId, "image", value.isPublished);
    return id ? changed(await db.update(skills).set({ ...value, version: sql`${skills.version} + 1`, updatedAt: new Date() }).where(and(eq(skills.id, id), eq(skills.version, expectedVersion!), isNull(skills.deletedAt))).returning()) : changed(await db.insert(skills).values(value).returning());
  }
  if (collection === "projects") {
    const value = projectInput.parse(data);
    await checkMedia(value.imageMediaId, "image", value.isPublished);
    return id ? changed(await db.update(projects).set({ ...value, version: sql`${projects.version} + 1`, updatedAt: new Date() }).where(and(eq(projects.id, id), eq(projects.version, expectedVersion!), isNull(projects.deletedAt))).returning()) : changed(await db.insert(projects).values(value).returning());
  }
  if (collection === "achievements") {
    const value = achievementInput.parse(data);
    await checkMedia(value.imageMediaId, "image", value.isPublished);
    return id ? changed(await db.update(achievements).set({ ...value, version: sql`${achievements.version} + 1`, updatedAt: new Date() }).where(and(eq(achievements.id, id), eq(achievements.version, expectedVersion!), isNull(achievements.deletedAt))).returning()) : changed(await db.insert(achievements).values(value).returning());
  }
  if (collection === "socials") {
    const value = socialInput.parse(data);
    checkIcon(value.iconKey);
    return id ? changed(await db.update(socialLinks).set({ ...value, version: sql`${socialLinks.version} + 1`, updatedAt: new Date() }).where(and(eq(socialLinks.id, id), eq(socialLinks.version, expectedVersion!), isNull(socialLinks.deletedAt))).returning()) : changed(await db.insert(socialLinks).values(value).returning());
  }
  if (collection === "videos") {
    const value = videoInput.parse(data);
    let parsed;
    try { parsed = parseYouTubeUrl(value.url); }
    catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Provide a valid YouTube URL."); }
    const { videoId, canonicalUrl } = parsed;

    // Deliberately validate duplicate active video IDs and return a useful conflict error
    const duplicates = await db
      .select({ id: youtubeVideos.id })
      .from(youtubeVideos)
      .where(and(eq(youtubeVideos.videoId, videoId), isNull(youtubeVideos.deletedAt)));
    if (duplicates.length && (!id || duplicates[0].id !== id)) {
      throw new HttpError(409, "A card for this YouTube video already exists in your collection.");
    }

    if (!id) {
      // New import: fetch YouTube metadata
      const meta = await fetchYouTubeMetadata(videoId);
      let fetchedTitle: string | null = null;
      let channelTitle: string | null = null;
      let thumbnailUrl: string | null = null;
      let metadataFetchedAt: Date | null = null;

      if (meta.ok && meta.title) {
        fetchedTitle = meta.title;
        channelTitle = meta.channelTitle;
        thumbnailUrl = meta.thumbnailUrl;
        metadataFetchedAt = new Date();
      } else {
        if (value.isPublished) {
          throw new HttpError(400, meta.error || "Cannot publish video without verified YouTube metadata. Save as draft instead.");
        }
      }

      const record = {
        videoId,
        url: canonicalUrl,
        fetchedTitle,
        titleOverride: value.titleOverride,
        description: value.description,
        thumbnailUrl,
        channelTitle,
        metadataFetchedAt,
        displayOrder: value.displayOrder,
        isPublished: value.isPublished,
      };

      try {
        return changed(await db.insert(youtubeVideos).values(record).returning());
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
          throw new HttpError(409, "A card for this YouTube video already exists in your collection.");
        }
        throw err;
      }
    } else {
      // Update existing video
      const [existing] = await db
        .select()
        .from(youtubeVideos)
        .where(and(eq(youtubeVideos.id, id), isNull(youtubeVideos.deletedAt)));
      if (!existing) throw new HttpError(404, "Video not found.");

      let fetchedTitle = existing.fetchedTitle;
      let channelTitle = existing.channelTitle;
      let thumbnailUrl = existing.thumbnailUrl;
      let metadataFetchedAt = existing.metadataFetchedAt;

      const urlChanged = existing.videoId !== videoId;
      const shouldFetch = Boolean(value.refreshMetadata) || urlChanged;

      if (shouldFetch) {
        const meta = await fetchYouTubeMetadata(videoId);
        if (meta.ok && meta.title) {
          fetchedTitle = meta.title;
          channelTitle = meta.channelTitle;
          thumbnailUrl = meta.thumbnailUrl;
          metadataFetchedAt = new Date();
        } else if (urlChanged) {
          if (value.isPublished) {
            throw new HttpError(400, meta.error || "Cannot publish video without verified YouTube metadata. Save as draft instead.");
          }
          fetchedTitle = null;
          channelTitle = null;
          thumbnailUrl = null;
          metadataFetchedAt = null;
        }
        else {
          throw new HttpError(502, "YouTube refresh failed. Your saved metadata and edits have not changed. Try again later.");
        }
      }

      // If published, ensure there is a non-empty display title
      const displayTitle = (value.titleOverride && value.titleOverride.trim()) || fetchedTitle;
      if (value.isPublished && !displayTitle) {
        throw new HttpError(400, "Cannot publish a video without a valid title.");
      }

      const updateData = {
        videoId,
        url: canonicalUrl,
        fetchedTitle,
        titleOverride: value.titleOverride,
        description: value.description,
        thumbnailUrl,
        channelTitle,
        metadataFetchedAt,
        displayOrder: value.displayOrder,
        isPublished: value.isPublished,
        version: sql`${youtubeVideos.version} + 1`,
        updatedAt: new Date(),
      };

      try {
        return changed(
          await db
            .update(youtubeVideos)
            .set(updateData)
            .where(and(eq(youtubeVideos.id, id), eq(youtubeVideos.version, expectedVersion!), isNull(youtubeVideos.deletedAt)))
            .returning()
        );
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
          throw new HttpError(409, "A card for this YouTube video already exists in your collection.");
        }
        throw err;
      }
    }
  }
  throw new HttpError(404, "Section not found.");
}
