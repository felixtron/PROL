import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { UnauthenticatedError } from "@/lib/auth";
import { getCompanyDocumentForClient } from "@/lib/queries/manual-document";
import { loadUploadAsDataUrl } from "@/lib/certificate-assets";
import { DocumentPdf, documentPdfFileName } from "@/lib/documents/pdf/document-pdf";

/**
 * PDF de un documento nativo ya emitido a una empresa.
 *
 * Calco de `app/api/dc3/[id]/pdf/route.tsx`, sin su bitácora de impresión: un
 * procedimiento no acredita a ninguna persona, así que no hay nada que
 * asentar (decisión cerrada en `04-CONTEXT.md`).
 *
 * Autorización reutilizada, nunca reinventada: `getCompanyDocumentForClient`
 * ya llama a `requireAssignmentMemberAccess`, el mismo camino que autoriza
 * verlo en pantalla. Quien no puede ver el documento en el visor tampoco
 * puede sacar su PDF.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyDocumentId: string }> },
) {
  try {
    const { companyDocumentId } = await params;
    const data = await getCompanyDocumentForClient(companyDocumentId);
    if (!data) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    if (data.identity.kind === "FILE") {
      return NextResponse.json(
        { error: "Este documento no tiene cuerpo nativo que exportar" },
        { status: 409 },
      );
    }

    // El logo se lee en vivo, en la ruta, una sola vez — nunca dentro de la
    // banda `fixed` del PDF (PDF-04: cambiar el logo cambia el PDF sin
    // regenerar nada).
    const companyLogoDataUrl = await loadUploadAsDataUrl(data.identity.companyLogo);

    const pdf = DocumentPdf({
      identity: data.identity,
      contentHtml: data.contentHtml,
      companyLogoDataUrl,
    });
    const stream = await renderToStream(pdf);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${documentPdfFileName(data.identity)}"`,
        // Sin caché: el logo se lee en vivo en cada descarga (PDF-04).
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Error";
    if (!isKnownAccessError(message)) {
      console.error("Error al generar el PDF del documento:", error);
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
