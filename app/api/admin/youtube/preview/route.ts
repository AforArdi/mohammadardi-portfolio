import { requireOwnerAdmin } from "@/lib/auth/guard";
import { apiError, assertSameOrigin, boundedBody, HttpError } from "@/lib/api";
import { getDb } from "@/db";
import { reserveRateLimit } from "@/lib/auth/queries";
import { fetchYouTubeMetadata, parseYouTubeUrl } from "@/lib/youtube/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const owner = await requireOwnerAdmin();

    const allowed = await getDb().execute(reserveRateLimit(`yt-preview:${owner.userId}`, 60, 3600));
    if (!allowed.length) {
      throw new HttpError(429, "Rate limit reached for video previews. Please wait before previewing again.");
    }

    const raw = await boundedBody(request, 2000);
    const body = JSON.parse(raw.toString("utf8"));
    if (!body || typeof body.url !== "string" || !body.url.trim()) {
      throw new HttpError(400, "Provide a YouTube URL.");
    }

    let parsed;
    try { parsed = parseYouTubeUrl(body.url); }
    catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Provide a valid YouTube URL."); }
    const { videoId, canonicalUrl } = parsed;
    const meta = await fetchYouTubeMetadata(videoId);

    return Response.json({
      ...meta,
      canonicalUrl,
    });
  } catch (error) {
    return apiError(error);
  }
}
