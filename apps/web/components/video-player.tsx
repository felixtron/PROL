"use client";

import { forwardRef } from "react";
import { buildCloudflareEmbedUrl, buildVimeoEmbedUrl } from "@prol/shared";

export type VideoProvider = "CLOUDFLARE" | "VIMEO_URL" | "VIMEO_UPLOAD";

interface VideoPlayerProps {
  videoUrl: string;
  provider: VideoProvider | null;
  videoHash?: string | null;
  className?: string;
  title?: string;
}

/**
 * Unified video player that renders the correct iframe based on provider.
 * Defaults to Cloudflare Stream for backwards compatibility.
 */
export const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  function VideoPlayer(
    { videoUrl, provider, videoHash, className, title },
    ref
  ) {
    const src =
      provider === "VIMEO_URL" || provider === "VIMEO_UPLOAD"
        ? buildVimeoEmbedUrl(videoUrl, videoHash)
        : buildCloudflareEmbedUrl(videoUrl);

    const isVimeo =
      provider === "VIMEO_URL" || provider === "VIMEO_UPLOAD";

    return (
      <iframe
        ref={ref}
        src={src}
        className={className ?? "h-full w-full"}
        title={title ?? "Video lesson"}
        allow={
          isVimeo
            ? "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
            : "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        }
        allowFullScreen
      />
    );
  }
);
