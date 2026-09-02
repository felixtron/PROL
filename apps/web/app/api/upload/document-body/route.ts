import { NextResponse } from "next/server";
import { UnauthenticatedError } from "@/lib/auth";
import { requireManualAdmin } from "@/lib/manual-access";
import { convertDocxToManualHtml } from "@/lib/documents/docx-to-html";

// Convierte un `.docx` a HTML saneado, para que el importador del editor de
// documentos (plan 03-06) lo pegue en el cuerpo. Esta ruta NO escribe en la
// base: quien guarda es `updateManualDocumentBody` (plan 03-04), que vuelve a
// sanear. Doble saneado es idempotente y barato; escribir aquí necesitaría
// además autorización sobre un documento concreto y duplicaría la política
// de versión de plantilla que ya vive en la acción.
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(req: Request) {
  try {
    // Escribir el cuerpo de un procedimiento es autoría de manual, no
    // revisión: la consultora produce el documento, el consultor lo
    // acompaña. `requireManualAdmin` comprueba además que el módulo esté
    // habilitado para el tenant, la misma puerta que respeta el resto del
    // módulo documental.
    await requireManualAdmin();

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
    // Extensión Y MIME, con el mismo criterio permisivo de `extract-text`:
    // algunos navegadores mandan el MIME vacío.
    const nameOk = file.name.toLowerCase().endsWith(".docx");
    const mimeOk = !file.type || file.type === DOCX_MIME;
    if (!nameOk || !mimeOk) {
      return NextResponse.json(
        { error: "Sólo se puede importar un archivo de Word (.docx)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let result;
    try {
      result = await convertDocxToManualHtml(buffer);
    } catch (err) {
      console.error("[document-body] Parse error:", err);
      return NextResponse.json(
        { error: "No se pudo leer el archivo" },
        { status: 500 },
      );
    }

    if (!result.html.trim()) {
      return NextResponse.json(
        { error: "El documento no tiene contenido que se pueda importar." },
        { status: 422 },
      );
    }
    return NextResponse.json({ ...result, source: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al importar";
    // Sin sesión y sin permisos son cosas distintas: la primera se arregla
    // entrando, la segunda no.
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith("No autorizado")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[document-body] Unexpected error:", err);
    return NextResponse.json({ error: "Error al importar" }, { status: 500 });
  }
}
