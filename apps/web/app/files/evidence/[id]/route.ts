import { NextResponse } from "next/server";
import { db } from "@prol/db";
import { requireUser, UnauthenticatedError } from "@/lib/auth";
import { assertDocumentsEnabled, isManualReviewer } from "@/lib/manual-access";
import { privateFileResponse, readPrivateFile } from "@/lib/document-storage";

export const dynamic = "force-dynamic";

/**
 * Descarga del archivo de una evidencia.
 *
 * Vive fuera de `/api` a propósito: el limitador de `middleware.ts` corta a 60
 * peticiones por minuto ahí, y una sección con varias evidencias abiertas a la
 * vez las agotaría. La autorización no depende de eso — se resuelve aquí,
 * contra la base, antes de tocar el disco.
 *
 * Pasan el personal del tenant y los miembros de la empresa dueña. Una
 * evidencia eliminada deja de descargarse aunque el archivo siga en disco: la
 * fila sobrevive para la trazabilidad, no para seguir sirviéndose.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const evidence = await db.evidence.findUnique({
      where: { id },
      select: {
        fileKey: true,
        fileName: true,
        mimeType: true,
        deletedAt: true,
        assignment: { select: { tenantId: true, companyId: true } },
      },
    });
    if (!evidence?.fileKey || evidence.deletedAt) {
      return new NextResponse("No encontrado", { status: 404 });
    }

    await assertDocumentsEnabled(evidence.assignment.tenantId, user.role);

    const allowed = isManualReviewer(user)
      ? user.role === "SUPER_ADMIN" || user.tenantId === evidence.assignment.tenantId
      : user.companyId === evidence.assignment.companyId;
    if (!allowed) {
      return new NextResponse("No autorizado", { status: 403 });
    }

    const buffer = await readPrivateFile(evidence.fileKey);
    if (!buffer) return new NextResponse("No encontrado", { status: 404 });

    return privateFileResponse(buffer, {
      fileName: evidence.fileName ?? "evidencia",
      mimeType: evidence.mimeType ?? "application/octet-stream",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (err instanceof UnauthenticatedError) {
      return new NextResponse("No autenticado", { status: 401 });
    }
    return new NextResponse(message, { status: 403 });
  }
}
