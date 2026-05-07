import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";
import { resolveUploadDir } from "@/lib/upload-paths";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Common assignment formats
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
};

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "entrega";
  return base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Acepta PDF, imágenes, Office, ZIP y TXT.",
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo supera los 25MB" },
        { status: 400 }
      );
    }
    if (file.size < 10) {
      return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
    }

    const ext = EXT_BY_MIME[file.type] ?? "bin";
    const storedName = `${crypto.randomUUID()}.${ext}`;

    const targetDir = resolveUploadDir("assignments");
    await mkdir(targetDir, { recursive: true });
    const filePath = join(targetDir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/assignments/${storedName}`,
      filename: safeFilename(file.name),
      sizeBytes: file.size,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error("Assignment upload error:", err);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
