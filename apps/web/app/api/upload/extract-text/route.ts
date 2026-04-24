import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

// Max 10 MB upload.
const MAX_BYTES = 10 * 1024 * 1024;

// Strict allow-list of (extension, MIME) pairs we will parse. Rejects
// anything else — including .md, source files, archives, etc.
const ACCEPTED = [
  {
    ext: ".txt",
    mimes: ["text/plain"],
  },
  {
    ext: ".pdf",
    mimes: ["application/pdf"],
  },
  {
    ext: ".docx",
    mimes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
];

function classify(file: File): (typeof ACCEPTED)[number] | null {
  const name = file.name.toLowerCase();
  for (const entry of ACCEPTED) {
    if (!name.endsWith(entry.ext)) continue;
    // Some browsers send empty or generic MIME types — accept if extension
    // matches and the MIME is blank or in the whitelist for that extension.
    if (!file.type || entry.mimes.includes(file.type)) return entry;
  }
  return null;
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (
    user.role !== "PROFESSOR" &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo faltante" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera 10 MB" },
      { status: 413 },
    );
  }

  const kind = classify(file);
  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Formato no permitido. Sube PDF, Word (.docx) o texto plano (.txt).",
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";
    if (kind.ext === ".txt") {
      text = buffer.toString("utf-8");
    } else if (kind.ext === ".pdf") {
      // pdf-parse uses pdfjs under the hood.
      const mod = await import("pdf-parse");
      const pdfParse = (mod as { default?: (b: Buffer) => Promise<{ text: string }> })
        .default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
      const parsed = await pdfParse(buffer);
      text = parsed.text ?? "";
    } else if (kind.ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    }

    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return NextResponse.json(
        {
          error:
            "No se encontró texto en el archivo (puede ser un PDF escaneado o estar vacío).",
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: normalized, source: file.name });
  } catch (err) {
    console.error("[extract-text] Parse error:", err);
    return NextResponse.json(
      { error: "No se pudo leer el archivo" },
      { status: 500 },
    );
  }
}
