// Contrato de archivos del módulo de Gestión Documental: qué formatos se
// aceptan, hasta qué tamaño, y cómo se sanea el nombre.
//
// Este archivo es DELIBERADAMENTE puro: sin `node:fs` ni nada de servidor,
// porque los formularios de subida son componentes de cliente y necesitan los
// mismos límites que valida el servidor. Mezclarlo con el acceso a disco haría
// que el bundler intentara meter `fs` en el navegador (mismo motivo por el que
// `certificate-templates/catalog.ts` vive aparte del renderizador).
//
// El acceso a disco está en `lib/document-storage.ts`.

/**
 * Tope por archivo. No es un capricho: Next 16 corta el cuerpo de la
 * petición en `proxyClientMaxBodySize` (30 MB en `next.config.js`), así que
 * subir de aquí sin tocar esa opción produce truncados silenciosos. El video
 * largo tiene su propio camino previsto (Cloudflare Stream), no este.
 */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** Documentos ofimáticos: lo que sirve como plantilla descargable. */
const OFFICE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

/** Evidencias además admiten lo que se captura en campo. */
const MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/webm": "weba",
  "audio/ogg": "ogg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const TEMPLATE_EXT_BY_MIME = OFFICE_TYPES;
export const EVIDENCE_EXT_BY_MIME: Record<string, string> = {
  ...OFFICE_TYPES,
  ...MEDIA_TYPES,
};

export const TEMPLATE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.zip";
export const EVIDENCE_ACCEPT = `${TEMPLATE_ACCEPT},.jpg,.jpeg,.png,.webp,.gif,.heic,.mp3,.m4a,.wav,.ogg,.mp4,.mov,.webm`;

/** Subdirectorios del disco privado. */
export type PrivateSubdir = "evidence" | "templates";

/** Nombre original saneado: es lo que ve el usuario al descargar. */
export function safeFilename(name: string, fallback = "archivo"): string {
  const base = name.split(/[/\\]/).pop() ?? fallback;
  const clean = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  return clean || fallback;
}

export interface StoredFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}
