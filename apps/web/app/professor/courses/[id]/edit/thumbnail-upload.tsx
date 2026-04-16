"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, Image as ImageIcon, X } from "lucide-react";
import { updateCourseThumbnail } from "@/lib/actions/course";

interface ThumbnailUploadProps {
  courseId: string;
  currentThumbnail: string | null;
}

export function ThumbnailUpload({
  courseId,
  currentThumbnail,
}: ThumbnailUploadProps) {
  const [status, setStatus] = useState<
    "idle" | "uploading" | "ready" | "error"
  >(currentThumbnail ? "ready" : "idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(currentThumbnail);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError("");
      setStatus("uploading");
      setProgress(0);

      try {
        // Validate file type on client side
        if (!file.type.startsWith("image/")) {
          throw new Error("Solo se permiten archivos de imagen");
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("El archivo es demasiado grande. Max 5 MB.");
        }

        // Upload to our API
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const response = await new Promise<{ url: string }>(
          (resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  resolve(data);
                } catch {
                  reject(new Error("Respuesta invalida del servidor"));
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  reject(new Error(errorData.error || "Error al subir"));
                } catch {
                  reject(new Error(`Error al subir: ${xhr.status}`));
                }
              }
            };
            xhr.onerror = () => reject(new Error("Error de conexion"));
            xhr.send(formData);
          }
        );

        // Update course with new thumbnail URL
        await updateCourseThumbnail(courseId, response.url);

        setThumbnailUrl(response.url);
        setStatus("ready");
        setProgress(100);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al subir la imagen"
        );
        setStatus("error");
      }
    },
    [courseId]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const input = fileInputRef.current;
        if (input) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    },
    []
  );

  return (
    <div className="rounded-lg border border-dashed border-border p-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {status === "idle" && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex w-full flex-col items-center gap-3 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
            <Upload className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              Subir imagen de portada
            </p>
            <p className="text-xs text-text-tertiary">
              Arrastra o haz clic para seleccionar
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              JPG, PNG o WEBP. Max 5 MB.
            </p>
          </div>
        </button>
      )}

      {status === "uploading" && (
        <div className="space-y-3 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Subiendo imagen...
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

      {status === "ready" && thumbnailUrl && (
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={thumbnailUrl}
              alt="Portada del curso"
              className="h-full w-full object-cover"
            />
            {isHovered && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    fileInputRef.current?.click();
                  }}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-text-primary shadow-lg transition-all hover:bg-surface-secondary"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <ImageIcon className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-text-primary">
                Imagen de portada
              </p>
              <p className="text-xs text-text-tertiary">
                Lista para mostrar
              </p>
            </div>
          </div>
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
