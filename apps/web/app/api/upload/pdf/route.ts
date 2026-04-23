import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";
import { requireUser } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 100; // bytes — reject empty/junk uploads
// PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

function safeFilename(name: string): string {
  // Strip any path traversal, keep alphanumerics, dots, hyphens.
  const base = name.split(/[/\\]/).pop() ?? "documento";
  return base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "PROFESSOR" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
    }
    if (file.size < MIN_FILE_SIZE) {
      return NextResponse.json({ error: "Archivo invalido o vacio" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo supera los 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Verify the file actually starts with the PDF magic header. Defense
    // against renamed binaries (e.g. .exe with .pdf extension).
    if (
      buffer.length < PDF_MAGIC.length ||
      !buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
    ) {
      return NextResponse.json(
        { error: "El archivo no es un PDF valido" },
        { status: 400 }
      );
    }

    const storedName = `${crypto.randomUUID()}.pdf`;
    // Next.js standalone runs from /app while the public folder lives at
    // /app/apps/web/public. Fall back to <cwd>/public for `pnpm dev`.
    const uploadDir = process.env.UPLOAD_DIR
      ? join(process.env.UPLOAD_DIR, "pdfs")
      : join(process.cwd(), "apps", "web", "public", "uploads", "pdfs");
    const fallbackDir = join(process.cwd(), "public", "uploads", "pdfs");

    let targetDir = uploadDir;
    try {
      await mkdir(targetDir, { recursive: true });
    } catch {
      targetDir = fallbackDir;
      await mkdir(targetDir, { recursive: true });
    }
    const filePath = join(targetDir, storedName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/pdfs/${storedName}`,
      filename: safeFilename(file.name),
      sizeBytes: file.size,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error("PDF upload error:", err);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
