"use client";

import { forwardRef } from "react";
import {
  buildCloudflareEmbedUrl,
  buildVimeoEmbedUrl,
  buildYouTubeEmbedUrl,
} from "@prol/shared";

export type VideoProvider =
  | "CLOUDFLARE"
  | "VIMEO_URL"
  | "VIMEO_UPLOAD"
  | "YOUTUBE";

interface VideoPlayerProps {
  videoUrl: string;
  provider: VideoProvider | null;
  videoHash?: string | null;
  startSeconds?: number | null;
  className?: string;
  title?: string;
}

/**
 * Unified video player that renders the correct iframe based on provider.
 * Defaults to Cloudflare Stream for backwards compatibility.
 */
export const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  function VideoPlayer(
    { videoUrl, provider, videoHash, startSeconds, className, title },
    ref
  ) {
    let src: string;
    let allow: string;

    if (provider === "YOUTUBE") {
      src = buildYouTubeEmbedUrl(videoUrl, startSeconds ?? null);
      allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    } else if (provider === "VIMEO_URL" || provider === "VIMEO_UPLOAD") {
      src = buildVimeoEmbedUrl(videoUrl, videoHash);
      allow =
        "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media";
    } else {
      src = buildCloudflareEmbedUrl(videoUrl);
      allow =
        "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture";
    }

    return (
      <iframe
        ref={ref}
        src={src}
        className={className ?? "h-full w-full"}
        title={title ?? "Video lesson"}
        allow={allow}
        allowFullScreen
      />
    );
  }
);
