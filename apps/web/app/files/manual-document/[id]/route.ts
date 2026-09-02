import { NextResponse } from "next/server";
import { db } from "@prol/db";
import { requireUser, UnauthenticatedError } from "@/lib/auth";
import { assertDocumentsEnabled, isManualReviewer } from "@/lib/manual-access";
import { privateFileResponse, readPrivateFile } from "@/lib/document-storage";

export const dynamic = "force-dynamic";

/**
 * Descarga de la plantilla BASE de un documento del catálogo.
 *
 * La base es el material de trabajo cuando la empresa todavía no tiene su
 * versión personalizada, así que la puede bajar cualquier empresa con ese
 * manual activo — pero sólo esas: comprobamos que exista una activación viva
 * para la empresa del usuario antes de servir nada.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const doc = await db.manualDocument.findUnique({
      where: { id },
      select: {
        baseFileKey: true,
        baseFileName: true,
        baseMimeType: true,
        manualId: true,
        manual: { select: { tenantId: true } },
      },
    });
    if (!doc?.baseFileKey) return new NextResponse("No encontrado", { status: 404 });

    await assertDocumentsEnabled(doc.manual.tenantId, user.role);

    let allowed =
      isManualReviewer(user) &&
      (user.role === "SUPER_ADMIN" || user.tenantId === doc.manual.tenantId);

    if (!allowed && user.companyId) {
      const assignment = await db.manualAssignment.findUnique({
        where: {
          manualId_companyId: { manualId: doc.manualId, companyId: user.companyId },
        },
        select: { status: true },
      });
      allowed = assignment?.status === "ACTIVE" || assignment?.status === "PAUSED";
    }
    if (!allowed) return new NextResponse("No autorizado", { status: 403 });

    const buffer = await readPrivateFile(doc.baseFileKey);
    if (!buffer) return new NextResponse("No encontrado", { status: 404 });

    return privateFileResponse(buffer, {
      fileName: doc.baseFileName ?? "plantilla",
      mimeType: doc.baseMimeType ?? "application/octet-stream",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (err instanceof UnauthenticatedError) {
      return new NextResponse("No autenticado", { status: 401 });
    }
    return new NextResponse(message, { status: 403 });
  }
}
