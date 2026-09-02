"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@prol/db";
import { requireUser, requireTenantAdmin } from "@/lib/auth";
import {
  isDc3OccupationCode,
  isDc3ThematicAreaCode,
} from "@/lib/dc3/catalogs";
import {
  isValidCurp,
  isValidRfc,
  normalizeCurp,
  normalizeRfc,
} from "@/lib/dc3/validation";
import { parseDateInput } from "@/lib/dc3/dates";
import { canAccessDc3 } from "@/lib/dc3/access";
import { Dc3NotReadyError, issueDc3ForEnrollment } from "@/lib/dc3/issuer";

/**
 * Acciones del módulo DC-3, agrupadas por el rol que las ejecuta:
 * trabajador, administrador de cursos de la empresa y administración de
 * la plataforma. La separación no es decorativa — cada bloque tiene su
 * propio gate, porque el formato oficial reparte la responsabilidad de
 * los datos exactamente así.
 */

const text = (formData: FormData, key: string): string | undefined => {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  return raw.trim();
};

function assertLength(value: string, max: number, label: string) {
  if (value.length > max) {
    throw new Error(`${label} no puede exceder ${max} caracteres`);
  }
}

async function requestAudit() {
  const h = await headers();
  return {
    ipAddress:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent"),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Trabajador — datos del bloque amarillo
// ─────────────────────────────────────────────────────────────────────

/**
 * El propio usuario revisa y completa sus datos. El nombre llega
 * precargado del perfil pero es editable: el formato pide "apellido
 * paterno, materno y nombre(s)", y casi nadie escribe su nombre así en
 * el perfil.
 */
export async function updateMyDc3Data(formData: FormData) {
  const user = await requireUser();

  const fullName = text(formData, "dc3FullName") ?? "";
  const curpRaw = text(formData, "curp") ?? "";
  const occupation = text(formData, "dc3OccupationCode") ?? "";
  const jobPosition = text(formData, "dc3JobPosition") ?? "";

  if (!fullName) throw new Error("El nombre completo es obligatorio");
  assertLength(fullName, 120, "El nombre completo");

  const curp = normalizeCurp(curpRaw);
  if (!curp) throw new Error("La CURP es obligatoria");
  if (!isValidCurp(curp)) {
    throw new Error(
      "La CURP no tiene un formato válido (18 caracteres, p. ej. GOMF850312HDFXXX09)"
    );
  }

  if (!occupation) throw new Error("La ocupación específica es obligatoria");
  if (!isDc3OccupationCode(occupation)) {
    throw new Error(
      "La ocupación debe elegirse del Catálogo Nacional de Ocupaciones"
    );
  }

  assertLength(jobPosition, 100, "El puesto");

  await db.user.update({
    where: { id: user.id },
    data: {
      dc3FullName: fullName,
      curp,
      dc3OccupationCode: occupation,
      // El puesto es opcional en el formato: vaciarlo es una orden válida.
      dc3JobPosition: jobPosition || null,
      dc3ConfirmedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/dc3");
  revalidatePath("/dashboard/certificates");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Administrador de cursos de la empresa — datos del patrón
// ─────────────────────────────────────────────────────────────────────

/**
 * Resuelve quién puede tocar los datos DC-3 de una empresa: su
 * administrador de cursos (el líder registrado) o la administración del
 * tenant. Se comprueba contra la empresa concreta, no contra el rol a
 * secas, para que un administrador no pueda editar el patrón de otra
 * empresa pasando otro id.
 */
async function requireCompanyDc3Editor(companyId: string) {
  const user = await requireUser();

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, tenantId: true, leaderId: true },
  });
  if (!company) throw new Error("Empresa no encontrada");

  const isAdmin =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === company.tenantId);
  const isLeader = company.leaderId === user.id;

  if (!isAdmin && !isLeader) throw new Error("No autorizado");

  return { user, company };
}

export async function updateCompanyDc3Data(
  companyId: string,
  formData: FormData
) {
  const { user } = await requireCompanyDc3Editor(companyId);

  const legalName = text(formData, "dc3LegalName") ?? "";
  const rfcRaw = text(formData, "dc3Rfc") ?? "";
  const legalRep = text(formData, "dc3LegalRepName") ?? "";
  const workersRep = text(formData, "dc3WorkersRepName") ?? "";

  if (!legalName) {
    throw new Error("El nombre o razón social del patrón es obligatorio");
  }
  assertLength(legalName, 160, "La razón social");

  const rfc = normalizeRfc(rfcRaw);
  if (!rfc) throw new Error("El RFC del patrón es obligatorio");
  if (!isValidRfc(rfc)) {
    throw new Error(
      "El RFC no tiene un formato válido (12 dígitos para persona moral, 13 para persona física, con homoclave)"
    );
  }

  if (!legalRep) {
    throw new Error(
      "El nombre del patrón o representante legal es obligatorio"
    );
  }
  assertLength(legalRep, 120, "El nombre del representante legal");
  assertLength(workersRep, 120, "El nombre del representante de los trabajadores");

  await db.company.update({
    where: { id: companyId },
    data: {
      dc3LegalName: legalName,
      dc3Rfc: rfc,
      dc3LegalRepName: legalRep,
      // Sólo firma en empresas de más de 50 trabajadores (nota 5), así que
      // vaciarlo es legítimo.
      dc3WorkersRepName: workersRep || null,
      dc3ConfirmedAt: new Date(),
      dc3ConfirmedById: user.id,
    },
  });

  revalidatePath("/dashboard/company");
  revalidatePath("/dashboard/dc3");
  revalidatePath(`/tenant-admin/companies/${companyId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// 3. Administración de la plataforma — agentes capacitadores
// ─────────────────────────────────────────────────────────────────────

function readAgentFields(formData: FormData) {
  const name = text(formData, "name") ?? "";
  const stpsRegistry = text(formData, "stpsRegistry") ?? "";
  const rfcRaw = text(formData, "rfc") ?? "";
  const logoUrl = text(formData, "logoUrl") ?? "";

  if (!name) throw new Error("El nombre del agente capacitador es obligatorio");
  assertLength(name, 160, "El nombre del agente capacitador");
  assertLength(stpsRegistry, 60, "El registro STPS");

  // El RFC del agente es opcional, pero si se captura tiene que ser un RFC.
  const rfc = rfcRaw ? normalizeRfc(rfcRaw) : "";
  if (rfc && !isValidRfc(rfc)) {
    throw new Error("El RFC del agente capacitador no tiene un formato válido");
  }

  // Sólo se aceptan rutas del volumen de uploads propio. Una URL externa
  // acabaría en una petición de red al renderizar el PDF, y ese es
  // exactamente el momento en que no se puede depender de terceros.
  if (logoUrl && !logoUrl.startsWith("/uploads/")) {
    throw new Error("El logotipo debe subirse desde el formulario");
  }

  return {
    name,
    stpsRegistry: stpsRegistry || null,
    rfc: rfc || null,
    logoUrl: logoUrl || null,
  };
}

export async function createTrainingAgent(formData: FormData) {
  const admin = await requireTenantAdmin();
  const tenantId = text(formData, "tenantId") || admin.tenantId;
  if (!tenantId) throw new Error("Tenant requerido");
  if (admin.role !== "SUPER_ADMIN" && tenantId !== admin.tenantId) {
    throw new Error("No autorizado");
  }

  const fields = readAgentFields(formData);

  const existing = await db.trainingAgent.findFirst({
    where: { tenantId, name: fields.name },
    select: { id: true },
  });
  if (existing) {
    throw new Error("Ya existe un agente capacitador con ese nombre");
  }

  const agent = await db.trainingAgent.create({
    data: { tenantId, ...fields },
  });

  revalidatePath("/tenant-admin/dc3");
  return { success: true, agentId: agent.id };
}

export async function updateTrainingAgent(
  agentId: string,
  formData: FormData
) {
  const admin = await requireTenantAdmin();

  const agent = await db.trainingAgent.findUnique({
    where: { id: agentId },
    select: { id: true, tenantId: true },
  });
  if (!agent) throw new Error("Agente capacitador no encontrado");
  if (admin.role !== "SUPER_ADMIN" && agent.tenantId !== admin.tenantId) {
    throw new Error("No autorizado");
  }

  const fields = readAgentFields(formData);
  const isActiveRaw = formData.get("isActive");

  await db.trainingAgent.update({
    where: { id: agentId },
    data: {
      ...fields,
      ...(isActiveRaw !== null ? { isActive: isActiveRaw === "true" } : {}),
    },
  });

  revalidatePath("/tenant-admin/dc3");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// 4. Administración de la plataforma — configuración DC-3 del curso
// ─────────────────────────────────────────────────────────────────────

/**
 * Gate de todo lo que cuelga de un curso en este módulo. Es
 * `requireTenantAdmin` y no el gate de edición de cursos a propósito: el
 * DC-3 tiene efectos ante la STPS, así que lo configura la
 * administración, no cada profesor dueño de su curso.
 */
async function requireCourseDc3Admin(courseId: string) {
  const admin = await requireTenantAdmin();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, tenantId: true, title: true, dc3TrainingAgentId: true },
  });
  if (!course) throw new Error("Curso no encontrado");
  if (admin.role !== "SUPER_ADMIN" && course.tenantId !== admin.tenantId) {
    throw new Error("No autorizado");
  }

  return { admin, course };
}

export async function updateCourseDc3Config(
  courseId: string,
  formData: FormData
) {
  const { course } = await requireCourseDc3Admin(courseId);

  const enabled = formData.get("dc3Enabled") === "true";
  const courseName = text(formData, "dc3CourseName") ?? "";
  const thematic = text(formData, "dc3ThematicAreaCode") ?? "";
  const durationRaw = text(formData, "dc3DurationHours") ?? "";
  const deliveryMode = text(formData, "dc3DeliveryMode") ?? "ONLINE";
  const instructor = text(formData, "dc3InstructorName") ?? "";
  const agentId = text(formData, "dc3TrainingAgentId") ?? "";

  assertLength(courseName, 200, "El nombre del curso en el DC-3");
  assertLength(instructor, 120, "El nombre del instructor");

  // Habilitar el DC-3 sin nombre oficial dejaría el curso listo para
  // imprimir su título interno ("tesis diploma", "Copy v2 — piloto") en
  // un documento que el patrón entrega a la STPS. Se exige aquí, y no
  // sólo al emitir, para que el error se vea al configurarlo y no meses
  // después con el trabajador esperando su constancia.
  if (enabled && !courseName) {
    throw new Error(
      "Para habilitar el DC-3 hay que capturar el nombre oficial del curso tal y como debe imprimirse en la constancia"
    );
  }

  if (thematic && !isDc3ThematicAreaCode(thematic)) {
    throw new Error("El área temática debe elegirse del catálogo oficial");
  }

  if (deliveryMode !== "ONLINE" && deliveryMode !== "LIVE") {
    throw new Error("Modalidad de impartición inválida");
  }

  let durationHours: number | null = null;
  if (durationRaw) {
    durationHours = Number(durationRaw);
    if (!Number.isInteger(durationHours) || durationHours <= 0) {
      throw new Error("La duración en horas debe ser un entero mayor que cero");
    }
    if (durationHours > 9999) {
      throw new Error("La duración en horas no es plausible");
    }
  }

  // El agente capacitador tiene que existir y ser del mismo tenant: es el
  // dato que la STPS usa para saber quién impartió la formación.
  //
  // Un agente dado de baja no puede asignarse a un curso NUEVO —para eso
  // sirve el interruptor—, pero sí sigue en los cursos que ya lo tenían:
  // dar de baja a una consultora no puede romper la emisión de las
  // formaciones que esa consultora sí impartió.
  if (agentId) {
    const agent = await db.trainingAgent.findFirst({
      where: { id: agentId, tenantId: course.tenantId },
      select: { id: true, name: true, isActive: true },
    });
    if (!agent) throw new Error("Agente capacitador no válido");
    if (!agent.isActive && agentId !== course.dc3TrainingAgentId) {
      throw new Error(
        `El agente capacitador "${agent.name}" está inactivo y no puede asignarse a cursos nuevos. Actívalo antes de usarlo.`
      );
    }
  }

  await db.course.update({
    where: { id: courseId },
    data: {
      dc3Enabled: enabled,
      dc3CourseName: courseName || null,
      dc3ThematicAreaCode: thematic || null,
      dc3DurationHours: durationHours,
      dc3DeliveryMode: deliveryMode,
      dc3InstructorName: instructor || null,
      dc3TrainingAgentId: agentId || null,
    },
  });

  revalidatePath("/tenant-admin/dc3");
  revalidatePath(`/tenant-admin/dc3/${courseId}`);
  revalidatePath("/dashboard/dc3");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// 5. Fechas reales de ejecución (ediciones)
// ─────────────────────────────────────────────────────────────────────

function readEditionDates(formData: FormData) {
  const startRaw = text(formData, "startDate") ?? "";
  const endRaw = text(formData, "endDate") ?? "";

  const startDate = parseDateInput(startRaw);
  const endDate = parseDateInput(endRaw);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("La fecha de inicio no es válida");
  }
  if (Number.isNaN(endDate.getTime())) {
    throw new Error("La fecha de término no es válida");
  }
  if (endDate < startDate) {
    throw new Error("La fecha de término no puede ser anterior a la de inicio");
  }

  return { startDate, endDate };
}

function readEditionOverrides(formData: FormData) {
  const name = text(formData, "name") ?? "";
  const instructorName = text(formData, "instructorName") ?? "";
  const durationRaw = text(formData, "durationHours") ?? "";

  if (!name) throw new Error("La edición necesita un nombre");
  assertLength(name, 120, "El nombre de la edición");
  assertLength(instructorName, 120, "El nombre del instructor");

  let durationHours: number | null = null;
  if (durationRaw) {
    durationHours = Number(durationRaw);
    if (!Number.isInteger(durationHours) || durationHours <= 0) {
      throw new Error("La duración en horas debe ser un entero mayor que cero");
    }
  }

  return { name, instructorName: instructorName || null, durationHours };
}

/**
 * Empresa que administra este usuario, o null.
 *
 * "Administrador de cursos de la empresa" es el líder registrado en
 * `Company.leaderId`: la persona que la administración del tenant designó
 * para responder por los datos de ese patrón. No es un rol global —un
 * mismo usuario es trabajador raso en todo lo demás—, por eso se resuelve
 * contra la empresa concreta y no contra `user.role`.
 */
async function ledCompany(userId: string) {
  return db.company.findUnique({
    where: { leaderId: userId },
    select: { id: true, tenantId: true, name: true },
  });
}

/**
 * Ámbito desde el que se capturan las fechas de ejecución de un curso.
 *
 *   companyId = null  → administración del tenant. Sus ediciones sirven a
 *                       todas las empresas.
 *   companyId = "…"   → administrador de cursos de esa empresa. Sólo ve y
 *                       toca las suyas.
 *
 * El ámbito no es cosmético: las fechas acaban impresas en la constancia
 * de cada trabajador, y dos empresas que toman el mismo curso lo toman en
 * semanas distintas. Sin esta separación, la empresa A reescribiría el
 * periodo que declara la empresa B.
 */
async function requireDc3EditionScope(courseId: string) {
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, tenantId: true },
  });
  if (!course) throw new Error("Curso no encontrado");

  const isTenantAdmin =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === course.tenantId);
  if (isTenantAdmin) {
    return { user, course, companyId: null as string | null, isTenantAdmin };
  }

  const company = await ledCompany(user.id);
  if (!company || company.tenantId !== course.tenantId) {
    throw new Error("No autorizado");
  }

  return { user, course, companyId: company.id, isTenantAdmin };
}

export async function createDc3Edition(courseId: string, formData: FormData) {
  const { course, companyId, isTenantAdmin } =
    await requireDc3EditionScope(courseId);

  const { startDate, endDate } = readEditionDates(formData);
  const overrides = readEditionOverrides(formData);

  // La administración del tenant puede crear la edición a nombre de una
  // empresa concreta; si no dice nada, la edición es del tenant y sirve a
  // todas. El administrador de la empresa no elige: siempre es la suya.
  let scopeCompanyId = companyId;
  if (isTenantAdmin) {
    const requested = text(formData, "companyId") ?? "";
    if (requested) {
      const company = await db.company.findFirst({
        where: { id: requested, tenantId: course.tenantId },
        select: { id: true },
      });
      if (!company) throw new Error("Empresa no válida");
      scopeCompanyId = company.id;
    }
  }

  const edition = await db.dc3CourseEdition.create({
    data: {
      tenantId: course.tenantId,
      courseId,
      companyId: scopeCompanyId,
      startDate,
      endDate,
      ...overrides,
    },
  });

  revalidatePath(`/tenant-admin/dc3/${courseId}`);
  revalidatePath("/dashboard/dc3/empresa");
  return { success: true, editionId: edition.id };
}

/**
 * Gate de una edición existente. El administrador de una empresa sólo
 * alcanza las que creó su propia empresa: una edición del tenant
 * (`companyId = null`) la comparten todas, así que dejarle editarla sería
 * dejarle cambiar las fechas de las constancias ajenas.
 */
async function requireEditionEditor(editionId: string) {
  const user = await requireUser();

  const edition = await db.dc3CourseEdition.findUnique({
    where: { id: editionId },
    select: {
      id: true,
      tenantId: true,
      courseId: true,
      companyId: true,
    },
  });
  if (!edition) throw new Error("Edición no encontrada");

  const isTenantAdmin =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === edition.tenantId);
  if (isTenantAdmin) return { user, edition, isTenantAdmin };

  const company = await ledCompany(user.id);
  if (!company || company.tenantId !== edition.tenantId) {
    throw new Error("No autorizado");
  }
  if (edition.companyId !== company.id) {
    throw new Error(
      "Estas fechas las administra la plataforma o son de otra empresa. Sólo puedes editar las que registró tu empresa."
    );
  }

  return { user, edition, isTenantAdmin };
}

export async function updateDc3Edition(editionId: string, formData: FormData) {
  const { edition } = await requireEditionEditor(editionId);

  const { startDate, endDate } = readEditionDates(formData);
  const overrides = readEditionOverrides(formData);

  await db.dc3CourseEdition.update({
    where: { id: editionId },
    data: { startDate, endDate, ...overrides },
  });

  revalidatePath(`/tenant-admin/dc3/${edition.courseId}`);
  revalidatePath("/dashboard/dc3/empresa");
  revalidatePath("/dashboard/dc3");
  return { success: true };
}

export async function deleteDc3Edition(editionId: string) {
  const { edition } = await requireEditionEditor(editionId);

  // Borrar una edición pondría a null el periodo de sus alumnos, y con él
  // el de constancias que aún no se han emitido. Se exige vaciarla antes
  // para que quien la borra vea a quién está dejando sin fechas.
  const assigned = await db.enrollment.count({
    where: { dc3EditionId: editionId },
  });
  if (assigned > 0) {
    throw new Error(
      `La edición tiene ${assigned} alumno(s) asignado(s). Reasígnalos antes de eliminarla.`
    );
  }

  await db.dc3CourseEdition.delete({ where: { id: editionId } });

  revalidatePath(`/tenant-admin/dc3/${edition.courseId}`);
  revalidatePath("/dashboard/dc3/empresa");
  return { success: true };
}

/**
 * Asigna (o desasigna, con `editionId = null`) la edición de un alumno.
 * De aquí sale el periodo de ejecución de los cursos en vivo.
 */
export async function setEnrollmentDc3Edition(
  enrollmentId: string,
  editionId: string | null
) {
  const user = await requireUser();

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      tenantId: true,
      courseId: true,
      student: { select: { companyId: true } },
    },
  });
  if (!enrollment) throw new Error("Inscripción no encontrada");

  const isTenantAdmin =
    user.role === "SUPER_ADMIN" ||
    (user.role === "ADMIN" && user.tenantId === enrollment.tenantId);

  // El administrador de cursos de la empresa asigna las fechas de SU
  // gente. Se comprueba contra la empresa del alumno, no contra el rol:
  // un líder no puede fechar la formación de los trabajadores de otro
  // patrón.
  let actorCompanyId: string | null = null;
  if (!isTenantAdmin) {
    const company = await ledCompany(user.id);
    if (
      !company ||
      company.tenantId !== enrollment.tenantId ||
      company.id !== enrollment.student.companyId
    ) {
      throw new Error("No autorizado");
    }
    actorCompanyId = company.id;
  }

  if (editionId) {
    // La edición tiene que ser de ESTE curso: cruzarlas imprimiría en la
    // constancia las fechas de una formación que el alumno no tomó. Y
    // para un administrador de empresa, además, tiene que ser suya o del
    // tenant — nunca la de otra empresa.
    const edition = await db.dc3CourseEdition.findFirst({
      where: {
        id: editionId,
        courseId: enrollment.courseId,
        ...(actorCompanyId
          ? { OR: [{ companyId: actorCompanyId }, { companyId: null }] }
          : {}),
      },
      select: { id: true },
    });
    if (!edition) {
      throw new Error(
        "La edición no pertenece a este curso o no está disponible para tu empresa"
      );
    }
  }

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { dc3EditionId: editionId },
  });

  revalidatePath(`/tenant-admin/dc3/${enrollment.courseId}`);
  revalidatePath("/dashboard/dc3/empresa");
  revalidatePath("/dashboard/dc3");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────
// 6. Emisión
// ─────────────────────────────────────────────────────────────────────

/**
 * Genera el DC-3 de una inscripción. Lo puede disparar el propio alumno,
 * el administrador de cursos de su empresa o la administración de la
 * plataforma — los tres ven el mismo botón y pasan por la misma
 * validación.
 *
 * Idempotente: si ya estaba emitido devuelve el existente en vez de
 * duplicarlo.
 */
export async function generateDc3(enrollmentId: string) {
  const user = await requireUser();

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      tenantId: true,
      studentId: true,
      student: { select: { companyId: true } },
    },
  });
  if (!enrollment) throw new Error("Inscripción no encontrada");

  const allowed = await canAccessDc3(user, {
    tenantId: enrollment.tenantId,
    companyId: enrollment.student.companyId,
    studentId: enrollment.studentId,
  });
  if (!allowed) throw new Error("No autorizado");

  try {
    const result = await issueDc3ForEnrollment(
      enrollmentId,
      user.id,
      await requestAudit()
    );

    revalidatePath("/dashboard/dc3");
    revalidatePath("/dashboard/certificates");
    return result;
  } catch (error) {
    // Los datos incompletos no son un fallo del sistema sino una lista de
    // tareas: se devuelve en un mensaje que nombra a cada responsable,
    // porque el alumno no puede arreglar el RFC de su patrón.
    if (error instanceof Dc3NotReadyError) {
      const detail = error.missing
        .map((m) => `${m.label} (${m.role})`)
        .join("; ");
      throw new Error(`Faltan datos para emitir el DC-3: ${detail}`);
    }
    throw error;
  }
}

/**
 * Cancela una constancia emitida por error. Reservado a la
 * administración: es exactamente la "gestión administrativa" de la que
 * advierte la leyenda de responsabilidad.
 */
export async function cancelDc3(dc3Id: string, reason: string) {
  const admin = await requireTenantAdmin();

  const dc3 = await db.dc3Certificate.findUnique({
    where: { id: dc3Id },
    select: { id: true, tenantId: true, status: true },
  });
  if (!dc3) throw new Error("Constancia DC-3 no encontrada");
  if (admin.role !== "SUPER_ADMIN" && dc3.tenantId !== admin.tenantId) {
    throw new Error("No autorizado");
  }
  if (dc3.status === "CANCELLED") {
    throw new Error("La constancia ya estaba cancelada");
  }

  const trimmed = reason.trim();
  if (trimmed.length < 3 || trimmed.length > 500) {
    throw new Error("El motivo debe tener entre 3 y 500 caracteres");
  }

  await db.dc3Certificate.update({
    where: { id: dc3Id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledReason: trimmed,
    },
  });

  revalidatePath("/tenant-admin/dc3");
  revalidatePath("/dashboard/dc3");
  return { success: true };
}
