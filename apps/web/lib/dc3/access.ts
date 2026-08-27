import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/**
 * Autorización del módulo DC-3, en un solo sitio.
 *
 * La constancia es un documento laboral entre el trabajador y su patrón,
 * así que el círculo es deliberadamente estrecho: el propio trabajador,
 * el líder de proyecto de su empresa (que es quien responde por los datos
 * del patrón) y la administración del tenant. El profesor del curso NO
 * entra: puede ver quién aprobó, pero el CURP de un alumno y el RFC de su
 * patrón no son asunto suyo.
 */

export interface Dc3Viewer {
  id: string;
  role: string;
  tenantId: string | null;
  companyId: string | null;
}

/** Empresa que lidera el usuario, o null. */
async function ledCompanyId(userId: string): Promise<string | null> {
  const company = await db.company.findUnique({
    where: { leaderId: userId },
    select: { id: true },
  });
  return company?.id ?? null;
}

export interface Dc3Subject {
  tenantId: string;
  companyId: string | null;
  studentId: string;
}

/** ¿Puede este usuario ver/imprimir la constancia de este alumno? */
export async function canAccessDc3(
  user: Dc3Viewer,
  subject: Dc3Subject
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.id === subject.studentId) return true;
  if (user.role === "ADMIN" && user.tenantId === subject.tenantId) return true;

  // Líder de proyecto: sólo sobre su propia empresa, y sólo si la
  // constancia está atada a ella.
  if (subject.companyId && user.tenantId === subject.tenantId) {
    const led = await ledCompanyId(user.id);
    if (led && led === subject.companyId) return true;
  }

  return false;
}

/**
 * Gate de las rutas y acciones que operan sobre un DC-3 ya emitido.
 * Devuelve el usuario y la constancia para que quien llama no repita la
 * consulta.
 */
export async function requireDc3Access(dc3Id: string) {
  const user = await requireUser();

  const dc3 = await db.dc3Certificate.findUnique({
    where: { id: dc3Id },
    include: {
      enrollment: { select: { studentId: true } },
    },
  });
  if (!dc3) throw new Error("Constancia DC-3 no encontrada");

  const allowed = await canAccessDc3(user, {
    tenantId: dc3.tenantId,
    companyId: dc3.companyId,
    studentId: dc3.enrollment.studentId,
  });
  if (!allowed) throw new Error("No autorizado");

  return { user, dc3 };
}
