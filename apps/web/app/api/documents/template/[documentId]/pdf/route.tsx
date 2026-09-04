import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { UnauthenticatedError } from "@/lib/auth";
import { assertTenantScope, requireManualAdmin } from "@/lib/manual-access";
import { loadTemplatePreviewIdentity } from "@/lib/documents/resolve-identity";
import { DocumentPdf, documentPdfFileName } from "@/lib/documents/pdf/document-pdf";

/**
 * Vista previa en PDF de la plantilla de un documento nativo, sin elegir
 * empresa: lo que el consultor ve antes de emitir a nadie.
 *
 * Sin empresa, `loadTemplatePreviewIdentity` sustituye la razón social por
 * el marcador «Empresa de ejemplo» (mismo truco que la vista previa del
 * diploma con «Nombre del Alumno») y el logo cae al placeholder de inicial —
 * nunca se toma prestado el de una empresa real.
 *
 * Autorización de administrador (rol + módulo habilitado) más ámbito de
 * tenant explícito: sin `assertTenantScope`, un ADMIN de otro tenant podría
 * previsualizar la plantilla ajena.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const user = await requireManualAdmin();

    const preview = await loadTemplatePreviewIdentity(documentId);
    if (!preview) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    assertTenantScope(user, preview.tenantId);

    if (preview.identity.kind === "FILE") {
      return NextResponse.json(
        { error: "Este documento no tiene cuerpo nativo que exportar" },
        { status: 409 },
      );
    }

    const pdf = DocumentPdf({
      identity: preview.identity,
      contentHtml: preview.contentHtml,
      // Sin empresa en la vista previa: la banda sale con el placeholder de
      // inicial, nunca con el logo de una empresa real.
      companyLogoDataUrl: null,
    });
    const stream = await renderToStream(pdf);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${documentPdfFileName(preview.identity)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Error";
    if (!isKnownAccessError(message)) {
      console.error("Error al generar el PDF de la plantilla:", error);
    }
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

/** Errores de negocio/autorización esperados: no se registran como fallo. */
function isKnownAccessError(message: string): boolean {
  return (
    message.startsWith("No autorizado") ||
    message.includes("no está habilitada") ||
    message.includes("no encontrado") ||
    message.includes("no encontrada")
  );
}
