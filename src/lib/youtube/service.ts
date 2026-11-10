export interface YouTubeParsedUrl {
  videoId: string;
  canonicalUrl: string;
}

export interface YouTubeMetadataResult {
  ok: boolean;
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  error?: string;
}

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

const TRUSTED_THUMBNAIL_HOSTS = new Set([
  "i.ytimg.com",
  "img.youtube.com",
  "i9.ytimg.com",
]);

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Parses and validates YouTube URLs against strict security requirements:
 * - HTTPS only
 * - No credentials in URL
 * - Standard HTTPS port only
 * - Exact allowlisted YouTube hosts (rejects lookalikes/subdomains)
 * - Supported paths: watch?v=, shorts/, live/, embed/, and youtu.be/<id>
 * - Exactly 11-character video ID
 * - Rejects playlist-only links and malformed IDs
 * - Normalizes to canonical https://www.youtube.com/watch?v=<id> without tracking query parameters
 */
export function parseYouTubeUrl(input: string): YouTubeParsedUrl {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Enter a valid YouTube URL.");
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS YouTube URLs are accepted.");
  }

  if (url.username || url.password) {
    throw new Error("Credentials in URLs are forbidden.");
  }

  if (url.port && url.port !== "443" && url.port !== "") {
    throw new Error("Unexpected URL port.");
  }

  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new Error(`Unsupported video host: "${hostname}". Only official YouTube links are allowed.`);
  }

  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    // Path shape: /<videoId> or /<videoId>/
    const match = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})\/?$/);
    if (match) videoId = match[1];
  } else {
    // Standard youtube hosts:
    if (url.pathname === "/watch") {
      const v = url.searchParams.get("v");
      if (v && VIDEO_ID_REGEX.test(v)) videoId = v;
    } else if (url.pathname.startsWith("/shorts/")) {
      const match = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})\/?$/);
      if (match) videoId = match[1];
    } else if (url.pathname.startsWith("/live/")) {
      const match = url.pathname.match(/^\/live\/([a-zA-Z0-9_-]{11})\/?$/);
      if (match) videoId = match[1];
    } else if (url.pathname.startsWith("/embed/")) {
      const match = url.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})\/?$/);
      if (match) videoId = match[1];
    }
  }

  if (!videoId || !VIDEO_ID_REGEX.test(videoId)) {
    if (url.searchParams.has("list") && !videoId) {
      throw new Error("Playlist-only links are not supported. Provide a specific video URL.");
    }
    throw new Error("Could not extract a valid 11-character YouTube video ID.");
  }

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Validates that a thumbnail URL returned by YouTube uses an explicitly trusted CDN domain,
 * safe HTTPS protocol, no credentials, and acceptable path structure.
 */
export function validateThumbnailUrl(urlStr: string): string | null {
  if (typeof urlStr !== "string" || !urlStr.trim()) return null;
  if (urlStr.includes("..")) return null;
  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port && parsed.port !== "443" && parsed.port !== "") return null;
    if (!TRUSTED_THUMBNAIL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    if (!/^\/vi(?:_webp)?\/[a-zA-Z0-9_-]{11}\/[a-zA-Z0-9_-]+\.(?:jpg|webp)$/.test(parsed.pathname)) return null;
    if (parsed.search || parsed.hash) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Fetches video metadata via YouTube oEmbed without an API key.
 * - Constructs a fixed request strictly from the validated video ID
 * - Enforces redirect: 'error' (no redirects)
 * - 5-second timeout
 * - Bounded response body (< 50,000 bytes)
 * - Validates JSON shape
 * - Validates thumbnail CDN hostname against allowlist
 */
export async function fetchYouTubeMetadata(videoId: string, fetchFn: typeof fetch = fetch): Promise<YouTubeMetadataResult> {
  if (!VIDEO_ID_REGEX.test(videoId)) {
    throw new Error("Invalid video ID format.");
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  try {
    const response = await fetchFn(oembedUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        ok: false,
        videoId,
        canonicalUrl,
        title: null,
        channelTitle: null,
        thumbnailUrl: null,
        error: response.status === 404
          ? "YouTube video was not found (it may be private, unlisted, or deleted)."
          : `YouTube oEmbed returned HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
      return {
        ok: false,
        videoId,
        canonicalUrl,
        title: null,
        channelTitle: null,
        thumbnailUrl: null,
        error: "YouTube oEmbed did not return JSON.",
      };
    }

    // Bounded reader (up to 50,000 bytes)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body available from provider.");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const MAX_OEMBED_BYTES = 50_000;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.length;
        if (totalBytes > MAX_OEMBED_BYTES) {
          await reader.cancel();
          throw new Error("YouTube oEmbed response exceeded bounded size.");
        }
        chunks.push(value);
      }
    }

    const bodyBuffer = Buffer.concat(chunks);
    const text = bodyBuffer.toString("utf8");
    const json = JSON.parse(text);

    if (typeof json !== "object" || json === null) {
      return {
        ok: false,
        videoId,
        canonicalUrl,
        title: null,
        channelTitle: null,
        thumbnailUrl: null,
        error: "Malformed JSON response from YouTube oEmbed.",
      };
    }

    const title = typeof json.title === "string" && json.title.trim() ? json.title.trim().slice(0, 300) : null;
    const channelTitle = typeof json.author_name === "string" && json.author_name.trim() ? json.author_name.trim().slice(0, 150) : null;
    const rawThumbnailUrl = typeof json.thumbnail_url === "string" ? json.thumbnail_url : null;
    const thumbnailUrl = rawThumbnailUrl ? validateThumbnailUrl(rawThumbnailUrl) : null;

    if (!title) {
      return {
        ok: false,
        videoId,
        canonicalUrl,
        title: null,
        channelTitle,
        thumbnailUrl,
        error: "YouTube oEmbed response did not include a valid video title.",
      };
    }

    return {
      ok: true,
      videoId,
      canonicalUrl,
      title,
      channelTitle,
      thumbnailUrl,
    };
  } catch (error) {
    return {
      ok: false,
      videoId,
      canonicalUrl,
      title: null,
      channelTitle: null,
      thumbnailUrl: null,
      error: error instanceof Error ? error.message : "Failed to fetch YouTube metadata.",
    };
  }
}
