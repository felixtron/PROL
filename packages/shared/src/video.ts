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
