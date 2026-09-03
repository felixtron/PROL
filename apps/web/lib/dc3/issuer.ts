import { db, type Prisma } from "@prol/db";
import {
  DC3_SOURCE_INCLUDE,
  DC3_ROLE_LABELS,
  evaluateDc3ForEnrollment,
} from "@/lib/dc3/readiness";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Emisor de DC-3 a nivel sistema.
 *
 * Igual que `certificate-issuer`, NO vive en un módulo `"use server"`: en
 * el App Router cada export async de un fichero así queda expuesto como
 * RPC, y eso permitiría a cualquier sesión autenticada emitir constancias
 * pasando un enrollmentId ajeno. Quien llama aquí ya validó la
 * autorización.
 *
 * Idempotente: si la inscripción ya tiene DC-3, lo devuelve sin tocar el
 * contador de folios.
 */

/** Formato del folio interno de control: PREFIJO-DC3-AAAA-NNNN. */
export function generateDc3Folio(
  prefix: string,
  year: number,
  seq: number
): string {
  const safePrefix = (prefix || BRAND_NAME)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return `${safePrefix}-DC3-${year}-${String(seq).padStart(4, "0")}`;
}

export class Dc3NotReadyError extends Error {
  constructor(
    message: string,
    readonly missing: { role: string; label: string }[]
  ) {
    super(message);
    this.name = "Dc3NotReadyError";
  }
}

export async function issueDc3ForEnrollment(
  enrollmentId: string,
  issuedById: string,
  audit?: { ipAddress?: string | null; userAgent?: string | null }
) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      ...DC3_SOURCE_INCLUDE,
      tenant: { select: { certificatePrefix: true } },
    },
  });

  if (!enrollment) throw new Error("Inscripción no encontrada");

  const readiness = evaluateDc3ForEnrollment(enrollment);

  if (!readiness.applicable) {
    throw new Error(
      readiness.notApplicableReason ?? "El DC-3 no aplica a esta inscripción"
    );
  }

  // Defensa en profundidad: aunque quien llama ya comprobó la conclusión
  // del curso, aquí se vuelve a exigir. Una constancia de competencias
  // acredita un curso terminado; emitirla antes es falsear el documento.
  if (!readiness.completed) {
    throw new Error("El curso todavía no está concluido");
  }

  if (!readiness.ready || !readiness.data) {
    throw new Dc3NotReadyError(
      "Faltan datos obligatorios para emitir el DC-3",
      readiness.missing.map((m) => ({
        role: DC3_ROLE_LABELS[m.role],
        label: m.label,
      }))
    );
  }

  const d = readiness.data;
  const issuedAt = new Date();
  const year = issuedAt.getUTCFullYear();
  const prefix = enrollment.tenant.certificatePrefix ?? BRAND_NAME;

  // Toda la mutación va dentro de una transacción para que un fallo en el
  // `create` también deshaga el incremento del contador. Si no, un fallo
  // parcial quema el folio N+1 sin emitir nada y la serie sale con
  // huecos — el mismo problema que ya se corrigió en los diplomas.
  return db.$transaction(async (tx) => {
    const existing = await tx.dc3Certificate.findUnique({
      where: { enrollmentId },
    });
    if (existing) {
      return {
        success: true as const,
        created: false as const,
        dc3Id: existing.id,
        folio: existing.folio,
        message: "El DC-3 ya estaba emitido",
      };
    }

    const counter = await tx.dc3Counter.upsert({
      where: { tenantId_year: { tenantId: enrollment.tenantId, year } },
      create: { tenantId: enrollment.tenantId, year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
    });

    const folio = generateDc3Folio(prefix, year, counter.lastSeq);

    const dc3 = await tx.dc3Certificate.create({
      data: {
        enrollmentId,
        tenantId: enrollment.tenantId,
        companyId: enrollment.student.company?.id ?? null,
        folio,
        status: "ACTIVE",

        workerName: d.workerName,
        workerCurp: d.workerCurp,
        occupationCode: d.occupationCode,
        occupationLabel: d.occupationLabel,
        jobPosition: d.jobPosition,

        employerName: d.employerName,
        employerRfc: d.employerRfc,
        legalRepName: d.legalRepName,
        workersRepName: d.workersRepName,

        courseName: d.courseName,
        durationHours: d.durationHours,
        startDate: d.startDate,
        endDate: d.endDate,
        thematicAreaCode: d.thematicAreaCode,
        thematicAreaLabel: d.thematicAreaLabel,
        trainingAgentName: d.trainingAgentName,
        trainingAgentRegistry: d.trainingAgentRegistry,
        instructorName: d.instructorName,

        issuedAt,
        issuedById,
        // Emitir no es imprimir. `printCount` lo lleva la ruta del PDF,
        // que es la única que sabe cuándo sale de verdad una copia; si se
        // contara aquí, un DC-3 emitido y nunca descargado figuraría como
        // entregado al trabajador.

        // De dónde salió el periodo, para poder auditar después por qué
        // una constancia dice las fechas que dice.
        metadata: {
          deliveryMode: enrollment.course.dc3DeliveryMode,
          editionId: enrollment.dc3Edition?.id ?? null,
          editionName: enrollment.dc3Edition?.name ?? null,
          courseId: enrollment.courseId,
        } satisfies Prisma.InputJsonValue,

        prints: {
          create: {
            userId: issuedById,
            action: "ISSUED",
            ipAddress: audit?.ipAddress ?? null,
            userAgent: audit?.userAgent ?? null,
          },
        },
      },
    });

    return {
      success: true as const,
      created: true as const,
      dc3Id: dc3.id,
      folio: dc3.folio,
      message: "DC-3 emitido correctamente",
    };
  });
}

/**
 * Registra una impresión. La llama la ruta del PDF cada vez que se
 * descarga una constancia: toda copia que sale a la calle tiene que
 * constar con quién la sacó y cuándo. La primera y las reimpresiones se
 * asientan igual; lo que las distingue es su lugar en el historial.
 */
export async function recordDc3Print(
  dc3Id: string,
  userId: string,
  audit?: { ipAddress?: string | null; userAgent?: string | null }
) {
  await db.$transaction([
    db.dc3Certificate.update({
      where: { id: dc3Id },
      data: { printCount: { increment: 1 }, lastPrintedAt: new Date() },
    }),
    db.dc3PrintLog.create({
      data: {
        dc3Id,
        userId,
        action: "PRINTED",
        ipAddress: audit?.ipAddress ?? null,
        userAgent: audit?.userAgent ?? null,
      },
    }),
  ]);
}
