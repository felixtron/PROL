import { NextRequest, NextResponse } from "next/server";
import { UnauthenticatedError } from "@/lib/auth";
import { requireManualReviewer } from "@/lib/manual-access";
import { TEMPLATE_EXT_BY_MIME } from "@/lib/document-files";
import { storePrivateFile } from "@/lib/document-storage";

/**
 * Sube una plantilla documental —la base global o la versión personalizada de
 * una empresa— al disco privado.
 *
 * A diferencia de las evidencias, aquí sí se exige rol de consultor en la
 * propia ruta: las plantillas las produce la consultora, nunca el cliente.
 */
export async function POST(request: NextRequest) {
  try {
    await requireManualReviewer();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const result = await storePrivateFile(file, "templates", TEMPLATE_EXT_BY_MIME);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al subir";
    // Sin sesión y sin permisos son cosas distintas: la primera se arregla
    // entrando, la segunda no. Antes las dos salían 403 porque la rama de
    // autenticación comparaba contra una cadena que ya no se lanzaba.
    if (err instanceof UnauthenticatedError) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith("No autorizado")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("Template upload error:", err);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
