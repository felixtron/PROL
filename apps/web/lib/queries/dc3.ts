import { cache } from "react";
import { db } from "@prol/db";
import { requireUser, requireTenantAdmin } from "@/lib/auth";
import {
  DC3_SOURCE_INCLUDE,
  evaluateDc3ForEnrollment,
  type Dc3Readiness,
} from "@/lib/dc3/readiness";

/**
 * Lecturas del módulo DC-3.
 *
 * Todo lo que decide "¿se puede emitir?" pasa por `evaluateDc3ForEnrollment`,
 * el mismo criterio que aplica el emisor. Estas consultas sólo cargan los
 * datos y los agrupan por pantalla.
 */

const DC3_SUMMARY_SELECT = {
  id: true,
  folio: true,
  status: true,
  issuedAt: true,
  printCount: true,
  lastPrintedAt: true,
  courseName: true,
  workerName: true,
  employerName: true,
  startDate: true,
  endDate: true,
} as const;

export interface Dc3EnrollmentRow {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  thumbnail: string | null;
  completedAt: Date | null;
  readiness: Dc3Readiness;
  dc3: {
    id: string;
    folio: string;
    status: string;
    issuedAt: Date;
    printCount: number;
    lastPrintedAt: Date | null;
  } | null;
}

/**
 * Panel DC-3 del trabajador: sus datos personales y una fila por cada
 * curso susceptible de constancia.
 *
 * `applicable: false` no se filtra aquí sino en la vista: la fila explica
 * al alumno por qué un curso concreto no ofrece DC-3, que es más útil que
 * hacerlo desaparecer.
 */
export const getMyDc3Panel = cache(async () => {
  const user = await requireUser();

  const [profile, enrollments] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        dc3FullName: true,
        curp: true,
        dc3OccupationCode: true,
        dc3JobPosition: true,
        dc3ConfirmedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            dc3LegalName: true,
            dc3Rfc: true,
            dc3LegalRepName: true,
            dc3WorkersRepName: true,
            dc3ConfirmedAt: true,
            leaderId: true,
          },
        },
      },
    }),
    db.enrollment.findMany({
      where: { studentId: user.id, course: { dc3Enabled: true } },
      include: {
        ...DC3_SOURCE_INCLUDE,
        dc3Certificate: { select: DC3_SUMMARY_SELECT },
      },
      orderBy: [{ completedAt: "desc" }, { enrolledAt: "desc" }],
    }),
  ]);

  const rows: Dc3EnrollmentRow[] = enrollments.map((e) => ({
    enrollmentId: e.id,
    courseId: e.courseId,
    courseTitle: e.course.title,
    thumbnail: null,
    completedAt: e.completedAt,
    readiness: evaluateDc3ForEnrollment(e),
    dc3: e.dc3Certificate
      ? {
          id: e.dc3Certificate.id,
          folio: e.dc3Certificate.folio,
          status: e.dc3Certificate.status,
          issuedAt: e.dc3Certificate.issuedAt,
          printCount: e.dc3Certificate.printCount,
          lastPrintedAt: e.dc3Certificate.lastPrintedAt,
        }
      : null,
  }));

  return { profile, rows };
});

/**
 * Estado DC-3 de una inscripción concreta. Lo usa el botón de la ficha de
 * curso y del listado de diplomas, donde sólo hace falta una fila.
 */
export const getDc3StatusForEnrollment = cache(
  async (enrollmentId: string, studentId: string) => {
    const enrollment = await db.enrollment.findFirst({
      where: { id: enrollmentId, studentId },
      include: {
        ...DC3_SOURCE_INCLUDE,
        dc3Certificate: { select: DC3_SUMMARY_SELECT },
      },
    });
    if (!enrollment) return null;

    return {
      readiness: evaluateDc3ForEnrollment(enrollment),
      dc3: enrollment.dc3Certificate,
    };
  }
);

/** Datos del patrón que administra el líder de proyecto. */
export const getCompanyDc3Data = cache(async (companyId: string) => {
  return db.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      dc3LegalName: true,
      dc3Rfc: true,
      dc3LegalRepName: true,
      dc3WorkersRepName: true,
      dc3ConfirmedAt: true,
      dc3ConfirmedBy: { select: { name: true, email: true } },
      _count: { select: { members: true, dc3Certificates: true } },
    },
  });
});

/** Agentes capacitadores registrados en el tenant. */
export const getTrainingAgents = cache(async (tenantId: string) => {
  return db.trainingAgent.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { courses: true } } },
  });
});

/** Listado de cursos del tenant con su estado de configuración DC-3. */
export const getTenantDc3Courses = cache(async () => {
  const admin = await requireTenantAdmin();
  if (!admin.tenantId) return [];

  return db.course.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: [{ dc3Enabled: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      dc3Enabled: true,
      dc3CourseName: true,
      dc3ThematicAreaCode: true,
      dc3DurationHours: true,
      dc3DeliveryMode: true,
      dc3InstructorName: true,
      dc3TrainingAgent: { select: { id: true, name: true } },
      _count: { select: { dc3Editions: true, enrollments: true } },
    },
  });
});

/**
 * Ficha DC-3 de un curso para el administrador: configuración, ediciones
 * y el estado de cada alumno inscrito (a quién le falta qué).
 */
export const getCourseDc3Detail = cache(async (courseId: string) => {
  const admin = await requireTenantAdmin();

  const course = await db.course.findFirst({
    where: {
      id: courseId,
      ...(admin.role === "SUPER_ADMIN" ? {} : { tenantId: admin.tenantId! }),
    },
    select: {
      id: true,
      title: true,
      tenantId: true,
      dc3Enabled: true,
      dc3CourseName: true,
      dc3ThematicAreaCode: true,
      dc3DurationHours: true,
      dc3DeliveryMode: true,
      dc3InstructorName: true,
      dc3TrainingAgentId: true,
    },
  });
  if (!course) return null;

  const [agents, editions, enrollments] = await Promise.all([
    getTrainingAgents(course.tenantId),
    db.dc3CourseEdition.findMany({
      where: { courseId },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { enrollments: true } } },
    }),
    db.enrollment.findMany({
      where: { courseId },
      include: {
        ...DC3_SOURCE_INCLUDE,
        dc3Certificate: { select: DC3_SUMMARY_SELECT },
      },
      orderBy: [{ completedAt: "desc" }, { enrolledAt: "desc" }],
      take: 500,
    }),
  ]);

  const students = enrollments.map((e) => ({
    enrollmentId: e.id,
    studentId: e.studentId,
    studentName: e.student.name,
    companyName: e.student.company?.name ?? null,
    status: e.status,
    completedAt: e.completedAt,
    editionId: e.dc3EditionId,
    readiness: evaluateDc3ForEnrollment(e),
    dc3: e.dc3Certificate,
  }));

  return { course, agents, editions, students };
});

/** Historial de emisión/reimpresión de una constancia. */
export const getDc3PrintHistory = cache(async (dc3Id: string) => {
  return db.dc3PrintLog.findMany({
    where: { dc3Id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
});
