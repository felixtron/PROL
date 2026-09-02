import { NextResponse } from "next/server";
import { db } from "@prol/db";
import { requireUser, UnauthenticatedError } from "@/lib/auth";
import { assertDocumentsEnabled, isManualReviewer } from "@/lib/manual-access";
import { privateFileResponse, readPrivateFile } from "@/lib/document-storage";

export const dynamic = "force-dynamic";

/**
 * Descarga de la plantilla personalizada de una empresa (con su logo, su
 * razón social y su código documental). Sólo la ve esa empresa y el personal
 * de su tenant: es un documento del cliente, no material del catálogo.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const doc = await db.companyDocument.findUnique({
      where: { id },
      select: {
        fileKey: true,
        fileName: true,
        mimeType: true,
        companyId: true,
        company: { select: { tenantId: true } },
      },
    });
    if (!doc) return new NextResponse("No encontrado", { status: 404 });

    await assertDocumentsEnabled(doc.company.tenantId, user.role);

    const allowed = isManualReviewer(user)
      ? user.role === "SUPER_ADMIN" || user.tenantId === doc.company.tenantId
      : user.companyId === doc.companyId;
    if (!allowed) return new NextResponse("No autorizado", { status: 403 });

    // Una versión nativa no tiene archivo: su cuerpo vive en `contentHtml` y se
    // lee por la vista del documento, no por aquí. 404 y no 500 — pedir el
    // archivo de algo que no lo tiene es un "no existe", no un fallo del
    // servidor. Mismo guard que /files/evidence/[id], donde `fileKey` es nullable
    // desde el diseño original.
    if (!doc.fileKey) return new NextResponse("No encontrado", { status: 404 });

    const buffer = await readPrivateFile(doc.fileKey);
    if (!buffer) return new NextResponse("No encontrado", { status: 404 });

    return privateFileResponse(buffer, {
      fileName: doc.fileName ?? "documento",
      mimeType: doc.mimeType ?? "application/octet-stream",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (err instanceof UnauthenticatedError) {
      return new NextResponse("No autenticado", { status: 401 });
    }
    return new NextResponse(message, { status: 403 });
  }
}
