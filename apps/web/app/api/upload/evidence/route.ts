import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { EVIDENCE_EXT_BY_MIME } from "@/lib/document-files";
import { storePrivateFile } from "@/lib/document-storage";

/**
 * Sube el archivo de una evidencia al disco privado y devuelve su clave.
 *
 * Sólo almacena: la evidencia no existe hasta que la acción `submitEvidence`
 * la asocia a una actividad, y esa acción es la que comprueba que quien sube
 * pertenece a la empresa. Separarlo permite subir mientras se escribe la
 * nota, igual que hacen las entregas de tareas.
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const result = await storePrivateFile(file, "evidence", EVIDENCE_EXT_BY_MIME);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.file);
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.error("Evidence upload error:", err);
    return NextResponse.json({ error: "Error al subir" }, { status: 500 });
  }
}
