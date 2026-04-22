"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, Video, X, Link as LinkIcon, Check } from "lucide-react";
import {
  createVideoUploadUrl,
  checkVideoStatus,
  setVideoFromUrl,
  clearLessonVideo,
} from "@/lib/actions/video";

interface VideoUploadProps {
  lessonId: string;
  currentVideoUrl: string | null;
  currentProvider:
    | "CLOUDFLARE"
    | "VIMEO_URL"
    | "VIMEO_UPLOAD"
    | "YOUTUBE"
    | null;
  currentRawUrl: string | null;
}

type Tab = "cloudflare" | "url";

export function VideoUpload({
  lessonId,
  currentVideoUrl,
  currentProvider,
  currentRawUrl,
}: VideoUploadProps) {
  const hasVideo = !!currentVideoUrl;
  const [tab, setTab] = useState<Tab>(
    currentProvider === "CLOUDFLARE" || !currentProvider ? "cloudflare" : "url"
  );

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-secondary p-1">
        <button
          type="button"
          onClick={() => setTab("cloudflare")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "cloudflare"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          Subir (Cloudflare Stream)
        </button>
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === "url"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          URL Vimeo / YouTube
        </button>
      </div>

      {tab === "cloudflare" && (
        <CloudflareUploader
          lessonId={lessonId}
          hasVideo={hasVideo && currentProvider === "CLOUDFLARE"}
        />
      )}

      {tab === "url" && (
        <UrlVideoInput
          lessonId={lessonId}
          currentRawUrl={
            currentProvider === "VIMEO_URL" ||
            currentProvider === "YOUTUBE"
              ? currentRawUrl
              : null
          }
          currentProvider={currentProvider}
        />
      )}

      {hasVideo && (
        <button
          type="button"
          onClick={async () => {
            if (!confirm("¿Quitar el video de esta lección?")) return;
            await clearLessonVideo(lessonId);
          }}
          className="text-xs font-medium text-red-600 hover:text-red-700"
        >
          Quitar video actual
        </button>
      )}
    </div>
  );
}

// ─── Cloudflare uploader ──────────────────────────────────────────────────────

function CloudflareUploader({
  lessonId,
  hasVideo,
}: {
  lessonId: string;
  hasVideo: boolean;
}) {
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "ready" | "error"
  >(hasVideo ? "ready" : "idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError("");
      setStatus("uploading");
      setProgress(0);

      try {
        const { uploadUrl } = await createVideoUploadUrl(lessonId);

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Error de conexión"));
          xhr.send(formData);
        });

        setStatus("processing");
        const pollInterval = setInterval(async () => {
          try {
            const result = await checkVideoStatus(lessonId);
            if (result.status === "ready") {
              setStatus("ready");
              clearInterval(pollInterval);
            }
          } catch {
            // keep polling
          }
        }, 5000);

        setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir el video");
        setStatus("error");
      }
    },
    [lessonId]
  );

  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {status === "idle" && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
            <Upload className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Subir video</p>
            <p className="text-xs text-text-tertiary">
              MP4, MOV o WEBM. Máx 6 horas.
            </p>
          </div>
        </button>
      )}

      {status === "uploading" && (
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Subiendo video...
            </p>
            <div className="mx-auto mt-2 h-2 w-48 overflow-hidden rounded-full bg-primary-100">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-tertiary">{progress}%</p>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent-500" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Procesando video...
            </p>
            <p className="text-xs text-text-tertiary">
              Esto puede tardar unos minutos.
            </p>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Video className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                Video listo
              </p>
              <p className="text-xs text-text-tertiary">
                Disponible para reproducción.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              fileInputRef.current?.click();
            }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Reemplazar
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3 text-center">
          <X className="mx-auto h-8 w-8 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setError("");
              }}
              className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vimeo / YouTube URL input ────────────────────────────────────────────────

function UrlVideoInput({
  lessonId,
  currentRawUrl,
  currentProvider,
}: {
  lessonId: string;
  currentRawUrl: string | null;
  currentProvider: "CLOUDFLARE" | "VIMEO_URL" | "VIMEO_UPLOAD" | "YOUTUBE" | null;
}) {
  const [url, setUrl] = useState(currentRawUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(!!currentRawUrl);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(false);
    try {
      await setVideoFromUrl(lessonId, url);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  const providerLabel =
    currentProvider === "YOUTUBE"
      ? "YouTube"
      : currentProvider === "VIMEO_URL"
        ? "Vimeo"
        : "video";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-primary">
          URL del video
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSuccess(false);
              }}
              placeholder="https://vimeo.com/123 o https://youtu.be/dQw4w9WgXcQ"
              required
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-text-tertiary">
          Acepta links de Vimeo y YouTube. El video debe ser público o &quot;no
          listado&quot;. Ejemplos:{" "}
          <code className="rounded bg-surface-secondary px-1 py-0.5 text-[10px]">
            vimeo.com/123456789
          </code>
          {" · "}
          <code className="rounded bg-surface-secondary px-1 py-0.5 text-[10px]">
            youtu.be/dQw4w9WgXcQ
          </code>
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />
          Video de {providerLabel} vinculado correctamente.
        </div>
      )}
    </form>
  );
}
