/**
 * Video URL parsers for Vimeo and other providers.
 *
 * Supported Vimeo URL formats:
 *   https://vimeo.com/123456789
 *   https://vimeo.com/123456789/abcdef1234         (with privacy hash)
 *   https://vimeo.com/channels/staffpicks/123
 *   https://vimeo.com/groups/foo/videos/123
 *   https://vimeo.com/showcase/X/video/123
 *   https://player.vimeo.com/video/123
 *   https://player.vimeo.com/video/123?h=abcdef
 */

export interface VimeoVideoInfo {
  videoId: string;
  hash: string | null;
  rawUrl: string;
}

export function parseVimeoUrl(input: string): VimeoVideoInfo | null {
  if (!input) return null;
  const url = input.trim();

  // Basic sanity check
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.endsWith("vimeo.com")) return null;

  // player.vimeo.com/video/{id}  (optional ?h=hash)
  if (host === "player.vimeo.com") {
    const match = parsed.pathname.match(/^\/video\/(\d+)/);
    if (!match) return null;
    const videoId = match[1]!;
    const hash = parsed.searchParams.get("h");
    return { videoId, hash, rawUrl: url };
  }

  // vimeo.com/* variants
  const segments = parsed.pathname.split("/").filter(Boolean);

  // showcase/{X}/video/{id}
  const showcaseIdx = segments.indexOf("showcase");
  if (showcaseIdx >= 0) {
    const videoIdx = segments.indexOf("video", showcaseIdx);
    if (videoIdx >= 0 && segments[videoIdx + 1]) {
      const videoId = segments[videoIdx + 1]!;
      if (/^\d+$/.test(videoId)) {
        return { videoId, hash: null, rawUrl: url };
      }
    }
  }

  // groups/{slug}/videos/{id}
  const groupsIdx = segments.indexOf("groups");
  if (groupsIdx >= 0) {
    const videosIdx = segments.indexOf("videos", groupsIdx);
    if (videosIdx >= 0 && segments[videosIdx + 1]) {
      const videoId = segments[videosIdx + 1]!;
      if (/^\d+$/.test(videoId)) {
        return { videoId, hash: null, rawUrl: url };
      }
    }
  }

  // channels/{slug}/{id}
  const channelsIdx = segments.indexOf("channels");
  if (channelsIdx >= 0 && segments[channelsIdx + 2]) {
    const videoId = segments[channelsIdx + 2]!;
    if (/^\d+$/.test(videoId)) {
      return { videoId, hash: null, rawUrl: url };
    }
  }

  // vimeo.com/{id}[/{hash}]
  if (segments.length >= 1 && /^\d+$/.test(segments[0]!)) {
    const videoId = segments[0]!;
    const hash =
      segments.length >= 2 && /^[a-zA-Z0-9]+$/.test(segments[1]!)
        ? segments[1]!
        : null;
    return { videoId, hash, rawUrl: url };
  }

  return null;
}

/**
 * Build the player embed URL for a Vimeo video.
 * Private videos require the privacy hash.
 */
export function buildVimeoEmbedUrl(
  videoId: string,
  hash?: string | null
): string {
  const params = new URLSearchParams();
  if (hash) params.set("h", hash);
  const query = params.toString();
  return `https://player.vimeo.com/video/${videoId}${query ? `?${query}` : ""}`;
}

/**
 * Build the Cloudflare Stream iframe URL for a video UID.
 */
export function buildCloudflareEmbedUrl(uid: string): string {
  return `https://iframe.videodelivery.net/${uid}`;
}

/**
 * YouTube URL parser.
 *
 * Supported YouTube URL formats:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   https://youtube.com/watch?v=dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ
 *   https://www.youtube.com/shorts/dQw4w9WgXcQ
 *   https://m.youtube.com/watch?v=dQw4w9WgXcQ
 *   With optional `t` / `start` query params (preserved for player).
 */
export interface YouTubeVideoInfo {
  videoId: string;
  startSeconds: number | null;
  rawUrl: string;
}

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function parseStartParam(val: string | null): number | null {
  if (!val) return null;
  // Supports "90", "90s", "1m30s", "1h2m3s"
  const plain = val.match(/^(\d+)s?$/);
  if (plain) return parseInt(plain[1]!, 10);
  const parts = val.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!parts) return null;
  const [, h, m, s] = parts;
  const total =
    (parseInt(h ?? "0", 10) * 3600) +
    (parseInt(m ?? "0", 10) * 60) +
    parseInt(s ?? "0", 10);
  return total > 0 ? total : null;
}

export function parseYouTubeUrl(input: string): YouTubeVideoInfo | null {
  if (!input) return null;
  const url = input.trim();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  const start =
    parseStartParam(parsed.searchParams.get("t")) ??
    parseStartParam(parsed.searchParams.get("start"));

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0] ?? "";
    if (YT_ID_RE.test(id)) {
      return { videoId: id, startSeconds: start, rawUrl: url };
    }
    return null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    // /watch?v=ID
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v") ?? "";
      if (YT_ID_RE.test(id)) {
        return { videoId: id, startSeconds: start, rawUrl: url };
      }
      return null;
    }
    // /embed/ID, /shorts/ID, /live/ID
    const match = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/);
    if (match) {
      return { videoId: match[1]!, startSeconds: start, rawUrl: url };
    }
  }

  return null;
}

/**
 * Build the YouTube embed URL. Uses the privacy-enhanced
 * youtube-nocookie.com domain and disables related videos.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  startSeconds?: number | null
): string {
  const params = new URLSearchParams();
  params.set("rel", "0");
  params.set("modestbranding", "1");
  if (startSeconds && startSeconds > 0) {
    params.set("start", String(startSeconds));
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Dispatch a URL to the correct parser. Returns a normalized result
 * that callers can use to persist to the DB without branching on host.
 */
export type DetectedVideo =
  | { provider: "VIMEO_URL"; videoId: string; hash: string | null; rawUrl: string }
  | { provider: "YOUTUBE"; videoId: string; startSeconds: number | null; rawUrl: string };

export function detectVideoUrl(url: string): DetectedVideo | null {
  const v = parseVimeoUrl(url);
  if (v) {
    return { provider: "VIMEO_URL", videoId: v.videoId, hash: v.hash, rawUrl: v.rawUrl };
  }
  const y = parseYouTubeUrl(url);
  if (y) {
    return {
      provider: "YOUTUBE",
      videoId: y.videoId,
      startSeconds: y.startSeconds,
      rawUrl: y.rawUrl,
    };
  }
  return null;
}
