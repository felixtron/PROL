/**
 * Herramientas de lectura del módulo de evidencias.
 *
 * Son el caso de referencia del harness: si una herramienta nueva no se
 * parece a éstas, probablemente esté rompiendo alguna invariante.
 *
 * Fíjate en lo que NO hay aquí: ni `tenantId`, ni `userId`, ni una sola
 * consulta a Prisma. Los handlers llaman a las mismas queries que usan las
 * páginas —`listEvidenceQueue`, `getEvidenceDetail`—, y esas resuelven la
 * sesión por dentro con `requireManualReviewer()` y
 * `requireEvidenceReviewAccess()`. El agente hereda el control de acceso ya
 * escrito; no lo reimplementa ni puede eludirlo.
 */

import { z } from "zod";
import {
  blocks,
  defineTool,
  neutralize,
  fail,
  ok,
  untrustedBlock,
} from "@prol/ai";
import { getEvidenceDetail, listEvidenceQueue } from "@/lib/queries/evidence";
import { commentEvidence } from "@/lib/actions/evidence";
import { guard, isoDate } from "@/lib/agent/guard";

const REVIEWER_ROLES = ["PROFESSOR", "ADMIN", "SUPER_ADMIN"] as const;
const EVIDENCE_SURFACES = ["evidence", "manuals", "companies", "dashboard"] as const;

/** Tope de filas que viajan al contexto. Por encima, el modelo pierde el hilo. */
const MAX_ROWS = 50;

export const listarEvidencias = defineTool({
  name: "listar_evidencias",
  description:
    "Lista la cola de evidencias del consultor: qué ha entregado cada empresa, " +
    "en qué estado está y cuándo vence. Úsala para responder qué hay pendiente " +
    "de revisar, qué va con retraso o qué falta por empresa o por manual.",
  kind: "read",
  module: "evidence",
  roles: REVIEWER_ROLES,
  surfaces: EVIDENCE_SURFACES,
  params: z.object({
    estado: z
      .enum([
        "PENDING",
        "IN_REVIEW",
        "NEEDS_CORRECTION",
        "APPROVED",
        "DELETION_REQUESTED",
        "ALL",
      ])
      .default("PENDING")
      .describe(
        "Estado por el que filtrar: PENDING (entregada, sin revisar), " +
          "IN_REVIEW (en revisión), NEEDS_CORRECTION (devuelta a la empresa), " +
          "APPROVED (aprobada), DELETION_REQUESTED (con baja solicitada) o " +
          "ALL (todas).",
      ),
    empresaId: z
      .string()
      .optional()
      .describe(
        "Identificador de la empresa para acotar la lista. Omítelo para ver " +
          "todas las empresas del consultor.",
      ),
    manualId: z
      .string()
      .optional()
      .describe(
        "Identificador del manual para acotar la lista. Omítelo para ver " +
          "todos los manuales.",
      ),
  }),
  run: async (args) =>
    guard("listar_evidencias", async () => {
      const rows = await listEvidenceQueue({
        status: args.estado,
        companyId: args.empresaId,
        manualId: args.manualId,
      });

      // Títulos, nombres de empresa y etiquetas de periodo son campos cortos
      // escritos por personas: se neutralizan y viajan como datos. No
      // contaminan el turno; el texto libre largo sí, y ése vive en
      // `obtener_detalle_evidencia`.
      const items = rows.slice(0, MAX_ROWS).map((row) => ({
        evidenciaId: row.id,
        version: row.version,
        estado: row.deletionRequestedAt ? "DELETION_REQUESTED" : row.status,
        titulo: neutralize(row.title),
        empresa: neutralize(row.assignment.company.name),
        empresaId: row.assignment.company.id,
        manual: neutralize(row.assignment.manual.title),
        manualId: row.assignment.manual.id,
        requisito: neutralize(row.activity.requirement.name),
        seccion: neutralize(
          `${row.activity.requirement.section.code} ${row.activity.requirement.section.title}`,
        ),
        periodo: neutralize(row.activity.periodLabel, 40),
        entregadaEl: isoDate(row.submittedAt),
        venceEl: isoDate(row.activity.dueAt),
        entregadaPor: neutralize(row.uploadedBy?.name ?? null, 60),
      }));

      return ok({
        filtro: {
          estado: args.estado,
          empresaId: args.empresaId ?? null,
          manualId: args.manualId ?? null,
        },
        total: rows.length,
        mostradas: items.length,
        truncado: rows.length > items.length,
        evidencias: items,
      });
    }),
});

export const obtenerDetalleEvidencia = defineTool({
  name: "obtener_detalle_evidencia",
  description:
    "Ficha completa de una evidencia concreta: estado, requisito al que " +
    "responde, historial de revisiones y versiones anteriores. Úsala cuando " +
    "necesites el detalle o la bitácora de una evidencia identificada.",
  kind: "read",
  module: "evidence",
  roles: REVIEWER_ROLES,
  surfaces: EVIDENCE_SURFACES,
  params: z.object({
    evidenciaId: z
      .string()
      .describe(
        "Identificador de la evidencia, tal y como lo devuelve " +
          "listar_evidencias en el campo evidenciaId.",
      ),
  }),
  run: async (args) =>
    guard("obtener_detalle_evidencia", async () => {
      const detail = await getEvidenceDetail(args.evidenciaId);
      if (!detail) {
        return ok({ encontrada: false });
      }
      const { evidence, versions, driveUrlIsInvalid } = detail;

      const data = {
        encontrada: true,
        evidenciaId: evidence.id,
        version: evidence.version,
        tipo: evidence.kind,
        estado: evidence.deletionRequestedAt
          ? "DELETION_REQUESTED"
          : evidence.status,
        titulo: neutralize(evidence.title),
        archivo: neutralize(evidence.fileName, 80),
        entregadaEl: isoDate(evidence.submittedAt),
        aprobadaEl: isoDate(evidence.approvedAt),
        entregadaPor: neutralize(evidence.uploadedBy?.name ?? null, 60),
        empresa: neutralize(evidence.assignment.company.name),
        empresaId: evidence.assignment.company.id,
        manual: neutralize(evidence.assignment.manual.title),
        enlaceDriveInvalido: driveUrlIsInvalid,
        actividad: {
          periodo: neutralize(evidence.activity.periodLabel, 40),
          venceEl: isoDate(evidence.activity.dueAt),
          estado: evidence.activity.status,
          requisito: neutralize(evidence.activity.requirement.name),
          periodicidad: evidence.activity.requirement.periodicity,
          seccion: neutralize(
            `${evidence.activity.requirement.section.code} ${evidence.activity.requirement.section.title}`,
          ),
        },
        // La bitácora sin los comentarios: quién hizo qué y cuándo es dato
        // nuestro; lo que escribieron va aparte, como contenido no confiable.
        bitacora: evidence.reviews.map((review) => ({
          accion: review.action,
          de: review.fromStatus,
          a: review.toStatus,
          fecha: isoDate(review.createdAt),
          autor: neutralize(review.reviewer?.name ?? null, 60),
          tieneComentario: Boolean(review.comment?.trim()),
        })),
        versiones: versions.map((v) => ({
          evidenciaId: v.id,
          version: v.version,
          estado: v.status,
          entregadaEl: isoDate(v.submittedAt),
          dadaDeBaja: v.deletedAt !== null,
        })),
      };

      // Texto libre largo escrito por la empresa cliente y por los revisores.
      // Devolverlo CONTAMINA el turno: a partir de aquí el agente sólo puede
      // leer, nunca proponer una escritura. Es exactamente lo que se busca —
      // una instrucción escondida en unas notas no puede llegar a proponer
      // "aprueba esta evidencia".
      const untrusted = blocks(
        untrustedBlock(
          `evidencia ${evidence.id}`,
          "notas de quien entregó la evidencia",
          evidence.notes,
        ),
        ...evidence.reviews.map((review) =>
          untrustedBlock(
            `revisión ${review.id}`,
            `comentario de revisión (${review.action})`,
            review.comment,
          ),
        ),
      );

      return ok(data, untrusted);
    }),
});

/**
 * Primera herramienta de ESCRITURA del catalogo.
 *
 * No se ejecuta en el bucle. `defineTool` marca `kind: "write"`, y eso hace
 * dos cosas: el bucle la aparca como propuesta en vez de llamarla, e
 * `invoke()` se niega a ejecutarla aunque alguien se equivoque de rama. El
 * unico camino que llega a `run` es `commit()`, y lo llama el endpoint de
 * confirmacion despues de que una persona apruebe la propuesta.
 *
 * Se eligio comentar —y no aprobar o devolver— como primera escritura a
 * proposito: es aditiva, no cambia el estado de nada y no dispara avisos a la
 * empresa. Si el circuito falla, el peor caso es un comentario de mas.
 */
export const comentarEvidencia = defineTool({
  name: "comentar_evidencia",
  description:
    "Propone dejar un comentario en la bitacora de una evidencia. NO cambia " +
    "su estado ni avisa a la empresa. La accion queda pendiente de que una " +
    "persona la confirme.",
  kind: "write",
  module: "evidence",
  roles: REVIEWER_ROLES,
  surfaces: EVIDENCE_SURFACES,
  params: z.object({
    evidenciaId: z
      .string()
      .describe(
        "Identificador de la evidencia sobre la que comentar, tal y como lo " +
          "devuelve listar_evidencias.",
      ),
    comentario: z
      .string()
      .min(3)
      .max(2_000)
      .describe(
        "Texto del comentario, redactado por ti para el consultor. Concreto y " +
          "en espanol; lo leera la empresa en la bitacora.",
      ),
  }),
  run: async (args) =>
    guard("comentar_evidencia", async () => {
      const result = await commentEvidence({
        evidenceId: args.evidenciaId,
        comment: args.comentario,
      });
      if (!result.success) return fail(result.error);
      return ok({ comentado: true, evidenciaId: args.evidenciaId });
    }),
});

export const evidenceTools = [
  listarEvidencias,
  obtenerDetalleEvidencia,
  comentarEvidencia,
];
