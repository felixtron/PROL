import { NextRequest, NextResponse } from "next/server";
import { db } from "@prol/db";
import { renderToStream } from "@react-pdf/renderer";
import { requireDc3Access } from "@/lib/dc3/access";
import { recordDc3Print } from "@/lib/dc3/issuer";
import { Dc3Document } from "@/lib/dc3/template";
import { loadUploadAsDataUrl } from "@/lib/certificate-assets";

/**
 * PDF de una constancia DC-3 ya emitida.
 *
 * A diferencia del diploma, esta ruta NO es pública: el documento lleva
 * la CURP del trabajador y el RFC de su patrón, así que sólo lo ven el
 * propio trabajador, el líder de proyecto de su empresa y la
 * administración del tenant (ver `lib/dc3/access`).
 *
 * Cada descarga queda asentada en el historial. Es un requisito del
 * módulo: hay que poder decir quién sacó cada copia y cuándo.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let user: { id: string };
  let dc3: Awaited<ReturnType<typeof requireDc3Access>>["dc3"];
  try {
    ({ user, dc3 } = await requireDc3Access(id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No autorizado";
    const status = message.includes("no encontrada") ? 404 : 403;
    return NextResponse.json({ error: message }, { status });
  }

  try {
    // Los logotipos se leen en vivo (no están congelados en el snapshot)
    // porque son marca, no dato acreditativo: reimprimir con el logo
    // actual del patrón no altera nada de lo que la constancia declara.
    const [company, agent] = await Promise.all([
      dc3.companyId
        ? db.company.findUnique({
            where: { id: dc3.companyId },
            select: { logo: true },
          })
        : null,
      db.trainingAgent.findFirst({
        where: { tenantId: dc3.tenantId, name: dc3.trainingAgentName },
        select: { logoUrl: true },
      }),
    ]);

    const [companyLogoDataUrl, agentLogoDataUrl] = await Promise.all([
      loadUploadAsDataUrl(company?.logo),
      loadUploadAsDataUrl(agent?.logoUrl),
    ]);

    const pdf = Dc3Document({
      workerName: dc3.workerName,
      workerCurp: dc3.workerCurp,
      occupationCode: dc3.occupationCode,
      occupationLabel: dc3.occupationLabel,
      jobPosition: dc3.jobPosition,

      employerName: dc3.employerName,
      employerRfc: dc3.employerRfc,
      legalRepName: dc3.legalRepName,
      workersRepName: dc3.workersRepName,

      courseName: dc3.courseName,
      durationHours: dc3.durationHours,
      startDate: new Date(dc3.startDate),
      endDate: new Date(dc3.endDate),
      thematicAreaCode: dc3.thematicAreaCode,
      thematicAreaLabel: dc3.thematicAreaLabel,
      trainingAgentName: dc3.trainingAgentName,
      trainingAgentRegistry: dc3.trainingAgentRegistry,
      instructorName: dc3.instructorName,

      folio: dc3.folio,
      issuedAt: new Date(dc3.issuedAt),
      companyLogoDataUrl,
      agentLogoDataUrl,
      // Una constancia cancelada se sigue pudiendo abrir —hace falta para
      // auditar qué se entregó— pero sale marcada para que nadie la
      // presente como válida.
      watermark: dc3.status === "CANCELLED" ? "CANCELADA" : null,
    });

    const stream = await renderToStream(pdf);

    // El asiento va después de renderizar: si el PDF falla, no se
    // registra una impresión que nunca ocurrió.
    await recordDc3Print(dc3.id, user.id, {
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="DC3-${dc3.folio}.pdf"`,
        // Nunca en caché compartida: lleva datos personales.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error generating DC-3 PDF:", error);
    return NextResponse.json(
      { error: "Error al generar la constancia DC-3" },
      { status: 500 }
    );
  }
}
