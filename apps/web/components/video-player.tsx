"use client";

import { forwardRef, useEffect, useMemo, useRef } from "react";
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

/**
 * Imperative handle exposed via `onReady`. Lets parent components
 * pause the video when an interactive stop fires, or seek back to a
 * specific timestamp.
 */
export interface PlayerAPI {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
}

interface VideoPlayerProps {
  videoUrl: string;
  provider: VideoProvider | null;
  videoHash?: string | null;
  startSeconds?: number | null;
  className?: string;
  title?: string;
  /** Fires every ~250-500ms with the current playback time in seconds. */
  onTimeUpdate?: (seconds: number) => void;
  /** Fires once when the underlying SDK finishes wiring up. */
  onReady?: (api: PlayerAPI) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLIFrameElement | string,
        options: Record<string, unknown>,
      ) => YouTubePlayer;
    };
    Vimeo?: { Player: new (el: HTMLIFrameElement) => VimeoPlayer };
    Stream?: (el: HTMLIFrameElement) => StreamPlayer;
    onYouTubeIframeAPIReady?: () => void;
    __PROL_YT_API_PROMISE__?: Promise<void>;
  }
}

interface VimeoPlayer {
  on(event: "timeupdate", cb: (data: { seconds: number }) => void): void;
  pause(): Promise<void>;
  play(): Promise<void>;
  setCurrentTime(s: number): Promise<number>;
  destroy?(): Promise<void>;
}

interface YouTubePlayer {
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy?(): void;
}

interface StreamPlayer {
  addEventListener(event: string, cb: () => void): void;
  pause(): void;
  play(): void;
  currentTime: number;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-prol-src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.prolLoaded === "1") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("script load error")),
        { once: true },
      );
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.prolSrc = src;
    s.addEventListener(
      "load",
      () => {
        s.dataset.prolLoaded = "1";
        resolve();
      },
      { once: true },
    );
    s.addEventListener(
      "error",
      () => reject(new Error("script load error")),
      { once: true },
    );
    document.head.appendChild(s);
  });
}

/** YouTube IFrame API has its own bootstrap (needs onYouTubeIframeAPIReady). */
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.YT?.Player) return Promise.resolve();
  if (window.__PROL_YT_API_PROMISE__) return window.__PROL_YT_API_PROMISE__;
  window.__PROL_YT_API_PROMISE__ = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    void loadScript("https://www.youtube.com/iframe_api");
  });
  return window.__PROL_YT_API_PROMISE__;
}

/**
 * Unified video player that renders the correct iframe based on provider
 * and bridges to each platform's JS SDK so callers can subscribe to
 * timeupdate events and pause/seek the video. Falls back to a plain
 * iframe (no callbacks) if the SDK fails to load.
 */
export const VideoPlayer = forwardRef<HTMLIFrameElement, VideoPlayerProps>(
  function VideoPlayer(
    {
      videoUrl,
      provider,
      videoHash,
      startSeconds,
      className,
      title,
      onTimeUpdate,
      onReady,
    },
    ref,
  ) {
    const localRef = useRef<HTMLIFrameElement | null>(null);

    // Stable callback refs so the SDK effect runs once per (provider, src)
    // rather than on every parent re-render.
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onReadyRef = useRef(onReady);
    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);
    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

    const { src, allow } = useMemo(() => {
      if (provider === "YOUTUBE") {
        const baseSrc = buildYouTubeEmbedUrl(videoUrl, startSeconds ?? null);
        const url = new URL(baseSrc);
        url.searchParams.set("enablejsapi", "1");
        if (typeof window !== "undefined") {
          url.searchParams.set("origin", window.location.origin);
        }
        return {
          src: url.toString(),
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        };
      }
      if (provider === "VIMEO_URL" || provider === "VIMEO_UPLOAD") {
        return {
          src: buildVimeoEmbedUrl(videoUrl, videoHash),
          allow:
            "autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media",
        };
      }
      return {
        src: buildCloudflareEmbedUrl(videoUrl),
        allow:
          "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture",
      };
    }, [provider, videoUrl, videoHash, startSeconds]);

    useEffect(() => {
      const iframe = localRef.current;
      if (!iframe) return;
      let cancelled = false;

      if (provider === "VIMEO_URL" || provider === "VIMEO_UPLOAD") {
        let player: VimeoPlayer | null = null;
        void loadScript("https://player.vimeo.com/api/player.js")
          .then(() => {
            if (cancelled || !window.Vimeo?.Player) return;
            player = new window.Vimeo.Player(iframe);
            player.on("timeupdate", (data) =>
              onTimeUpdateRef.current?.(data.seconds),
            );
            onReadyRef.current?.({
              pause: () => {
                player?.pause().catch(() => {});
              },
              play: () => {
                player?.play().catch(() => {});
              },
              seekTo: (s) => {
                player?.setCurrentTime(s).catch(() => {});
              },
            });
          })
          .catch(() => {});
        return () => {
          cancelled = true;
          try {
            void player?.destroy?.();
          } catch {
            /* noop */
          }
        };
      }

      if (provider === "YOUTUBE") {
        let player: YouTubePlayer | null = null;
        let pollInterval: ReturnType<typeof setInterval> | null = null;
        void loadYouTubeAPI()
          .then(() => {
            if (cancelled || !window.YT?.Player) return;
            player = new window.YT.Player(iframe, {
              events: {
                onReady: () => {
                  if (!player) return;
                  onReadyRef.current?.({
                    pause: () => player?.pauseVideo(),
                    play: () => player?.playVideo(),
                    seekTo: (s) => player?.seekTo(s, true),
                  });
                  pollInterval = setInterval(() => {
                    try {
                      const t = player?.getCurrentTime();
                      if (typeof t === "number")
                        onTimeUpdateRef.current?.(t);
                    } catch {
                      /* noop */
                    }
                  }, 400);
                },
              },
            });
          })
          .catch(() => {});
        return () => {
          cancelled = true;
          if (pollInterval) clearInterval(pollInterval);
          try {
            player?.destroy?.();
          } catch {
            /* noop */
          }
        };
      }

      // CLOUDFLARE Stream — uses iframe SDK to expose currentTime + events.
      let player: StreamPlayer | null = null;
      void loadScript("https://embed.videodelivery.net/embed/sdk.latest.js")
        .then(() => {
          if (cancelled || typeof window.Stream !== "function") return;
          player = window.Stream(iframe);
          player.addEventListener("timeupdate", () => {
            try {
              if (player) onTimeUpdateRef.current?.(player.currentTime);
            } catch {
              /* noop */
            }
          });
          onReadyRef.current?.({
            pause: () => player?.pause(),
            play: () => player?.play(),
            seekTo: (s) => {
              if (player) {
                try {
                  player.currentTime = s;
                } catch {
                  /* noop */
                }
              }
            },
          });
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [provider, src]);

    return (
      <iframe
        // `key` forces React to unmount and remount the iframe whenever the
        // video source changes. Without this the same DOM node is reused and
        // the Vimeo/YouTube/Cloudflare SDK from the previous lesson — which
        // mutates the iframe with `destroy()` — leaves the node in a zombie
        // state, so the next lesson renders a black box.
        key={`${provider}-${src}`}
        ref={(node) => {
          localRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        src={src}
        className={className ?? "h-full w-full"}
        title={title ?? "Video lesson"}
        allow={allow}
        allowFullScreen
      />
    );
  },
);
