import {
  dc3OccupationLabel,
  dc3ThematicAreaLabel,
} from "@/lib/dc3/catalogs";
import { isValidCurp, isValidRfc } from "@/lib/dc3/validation";
import { toCalendarDate } from "@/lib/dc3/dates";

/**
 * Regla única de "¿este DC-3 se puede emitir?".
 *
 * Es una función pura sobre un objeto plano —y no una consulta— porque la
 * necesitan tres sitios con la misma respuesta: el panel del alumno (para
 * decirle qué falta), el emisor (para negarse a imprimir incompletos) y
 * el panel del administrador (para ver qué constancias están atascadas y
 * en manos de quién). Si cada uno tuviera su propio criterio, la pantalla
 * diría "listo" y el botón fallaría.
 */

/** Quién es responsable de completar un dato que falta. */
export type Dc3Role = "WORKER" | "EMPLOYER" | "COURSE";

/**
 * Nombra al responsable con el título con el que esa persona se reconoce
 * dentro de la plataforma. "Administrador" a secas no servía: hay dos, y
 * el trabajador que ve el aviso necesita saber a cuál de los dos ir a
 * buscar — el de su propia empresa o el de la plataforma.
 */
export const DC3_ROLE_LABELS: Record<Dc3Role, string> = {
  WORKER: "Trabajador",
  EMPLOYER: "Administrador de cursos de la empresa",
  COURSE: "Administrador de la plataforma",
};

export interface Dc3MissingField {
  role: Dc3Role;
  field: string;
  label: string;
}

export interface Dc3Source {
  enrollment: {
    id: string;
    status: string;
    enrolledAt: Date;
    completedAt: Date | null;
    /** Hay un intento aprobado del examen final del curso. */
    passedFinalExam: boolean;
  };
  user: {
    id: string;
    name: string | null;
    companyId: string | null;
    dc3FullName: string | null;
    curp: string | null;
    dc3OccupationCode: string | null;
    dc3JobPosition: string | null;
  };
  company: {
    id: string;
    name: string;
    dc3LegalName: string | null;
    dc3Rfc: string | null;
    dc3LegalRepName: string | null;
    dc3WorkersRepName: string | null;
  } | null;
  course: {
    id: string;
    title: string;
    dc3Enabled: boolean;
    dc3CourseName: string | null;
    dc3ThematicAreaCode: string | null;
    dc3DurationHours: number | null;
    dc3DeliveryMode: string;
    dc3InstructorName: string | null;
    dc3TrainingAgent: {
      name: string;
      stpsRegistry: string | null;
    } | null;
    /** El curso tiene examen final configurado. */
    hasFinalExam: boolean;
  };
  edition: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    durationHours: number | null;
    instructorName: string | null;
  } | null;
}

/** Los datos ya resueltos, tal y como se congelan al emitir. */
export interface Dc3ResolvedData {
  workerName: string;
  workerCurp: string;
  occupationCode: string;
  occupationLabel: string;
  jobPosition: string | null;

  employerName: string;
  employerRfc: string;
  legalRepName: string;
  workersRepName: string | null;

  courseName: string;
  durationHours: number;
  startDate: Date;
  endDate: Date;
  thematicAreaCode: string;
  thematicAreaLabel: string;
  trainingAgentName: string;
  trainingAgentRegistry: string | null;
  instructorName: string;
}

export interface Dc3Readiness {
  /** false = a este alumno no le corresponde un DC-3 en este curso. */
  applicable: boolean;
  /** Por qué no aplica. Null cuando sí aplica. */
  notApplicableReason: string | null;
  /** El curso está concluido (requisito para emitir). */
  completed: boolean;
  missing: Dc3MissingField[];
  /** Se puede emitir ya. */
  ready: boolean;
  /** Completo sólo cuando `ready`; si no, null. */
  data: Dc3ResolvedData | null;
}

const NOT_APPLICABLE = (reason: string): Dc3Readiness => ({
  applicable: false,
  notApplicableReason: reason,
  completed: false,
  missing: [],
  ready: false,
  data: null,
});

const clean = (v: string | null | undefined) => v?.trim() || null;

export function evaluateDc3(source: Dc3Source): Dc3Readiness {
  const { enrollment, user, company, course, edition } = source;

  // El DC-3 lo emite un patrón. Sin empresa asociada no hay patrón que lo
  // firme, así que ni se ofrece: no es un dato que falte, es un documento
  // que no le corresponde a este alumno.
  if (!user.companyId || !company) {
    return NOT_APPLICABLE(
      "El DC-3 lo emite la empresa que capacitó al trabajador. Esta cuenta no está asociada a ninguna empresa."
    );
  }

  if (!course.dc3Enabled) {
    return NOT_APPLICABLE(
      "Este curso no está configurado para emitir constancias DC-3."
    );
  }

  const missing: Dc3MissingField[] = [];
  const need = (role: Dc3Role, field: string, label: string) =>
    missing.push({ role, field, label });

  // ── Datos del trabajador ────────────────────────────────────────
  const workerName = clean(user.dc3FullName) ?? clean(user.name);
  if (!workerName) {
    need("WORKER", "dc3FullName", "Nombre completo del trabajador");
  }

  const curp = clean(user.curp);
  if (!curp) {
    need("WORKER", "curp", "CURP");
  } else if (!isValidCurp(curp)) {
    need("WORKER", "curp", "CURP con formato válido");
  }

  const occupationCode = clean(user.dc3OccupationCode);
  const occupationLabel = dc3OccupationLabel(occupationCode);
  if (!occupationCode || !occupationLabel) {
    need(
      "WORKER",
      "dc3OccupationCode",
      "Ocupación específica (Catálogo Nacional de Ocupaciones)"
    );
  }

  // El puesto es opcional en el formato oficial ("* Dato no obligatorio"),
  // así que no bloquea la emisión.
  const jobPosition = clean(user.dc3JobPosition);

  // ── Datos de la empresa ─────────────────────────────────────────
  const employerName = clean(company.dc3LegalName) ?? clean(company.name);
  if (!employerName) {
    need("EMPLOYER", "dc3LegalName", "Nombre o razón social del patrón");
  }

  const employerRfc = clean(company.dc3Rfc);
  if (!employerRfc) {
    need("EMPLOYER", "dc3Rfc", "RFC del patrón");
  } else if (!isValidRfc(employerRfc)) {
    need("EMPLOYER", "dc3Rfc", "RFC del patrón con formato válido");
  }

  const legalRepName = clean(company.dc3LegalRepName);
  if (!legalRepName) {
    need(
      "EMPLOYER",
      "dc3LegalRepName",
      "Nombre del patrón o representante legal"
    );
  }

  // Sólo lo firman las empresas de más de 50 trabajadores (nota 5 del
  // formato), así que su ausencia no bloquea nada.
  const workersRepName = clean(company.dc3WorkersRepName);

  // ── Datos del programa de capacitación ──────────────────────────
  // Deliberadamente NO se cae a `course.title`. El título interno es de
  // uso doméstico ("tesis diploma", "Copy v2 — piloto") y aquí acaba
  // impreso en un documento oficial que el patrón entrega a la STPS. Si
  // nadie capturó el nombre oficial, el dato falta: no hay sustituto
  // aceptable.
  const courseName = clean(course.dc3CourseName);
  if (!courseName) {
    need(
      "COURSE",
      "dc3CourseName",
      "Nombre oficial del curso tal y como debe imprimirse en el DC-3"
    );
  }

  const durationHours = edition?.durationHours ?? course.dc3DurationHours;
  if (!durationHours || durationHours <= 0) {
    need("COURSE", "dc3DurationHours", "Duración en horas");
  }

  const thematicAreaCode = clean(course.dc3ThematicAreaCode);
  const thematicAreaLabel = dc3ThematicAreaLabel(thematicAreaCode);
  if (!thematicAreaCode || !thematicAreaLabel) {
    need("COURSE", "dc3ThematicAreaCode", "Área temática del curso");
  }

  const agent = course.dc3TrainingAgent;
  if (!agent) {
    need("COURSE", "dc3TrainingAgentId", "Agente capacitador");
  }

  const instructorName =
    clean(edition?.instructorName) ?? clean(course.dc3InstructorName);
  if (!instructorName) {
    need("COURSE", "dc3InstructorName", "Nombre del instructor o tutor");
  }

  // ── Periodo de ejecución ────────────────────────────────────────
  // Deliberadamente NO se usa la fecha de creación del curso: no dice
  // nada sobre cuándo se capacitó a nadie.
  //
  //   LIVE   — lo fija la edición a la que se asignó al alumno. La fecha
  //            programada y la real difieren a menudo, y la que vale es
  //            la real.
  //   ONLINE — es la ventana propia del alumno: de su inscripción al día
  //            en que completó el curso. Es lo único que consta como
  //            impartición efectiva de un pregrabado, y es distinta para
  //            cada persona.
  const completed = enrollment.status === "COMPLETED" && !!enrollment.completedAt;

  // La constancia acredita competencias, no asistencia: si el curso tiene
  // examen final, aprobarlo es la evidencia de que se adquirieron. Se
  // comprueba aparte de `completed` porque son cosas distintas y el
  // trabajador merece leer cuál de las dos le falta.
  if (course.hasFinalExam && !enrollment.passedFinalExam) {
    need("WORKER", "finalExam", "Evaluación final del curso aprobada");
  }

  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (course.dc3DeliveryMode === "LIVE") {
    if (!edition) {
      need(
        "COURSE",
        "dc3EditionId",
        "Edición con fechas reales de impartición asignada al alumno"
      );
    } else {
      startDate = edition.startDate;
      endDate = edition.endDate;
    }
  } else if (enrollment.completedAt) {
    startDate = toCalendarDate(enrollment.enrolledAt);
    endDate = toCalendarDate(enrollment.completedAt);
  }

  const ready =
    completed &&
    missing.length === 0 &&
    !!startDate &&
    !!endDate &&
    !!workerName &&
    !!curp &&
    !!occupationCode &&
    !!occupationLabel &&
    !!employerName &&
    !!employerRfc &&
    !!legalRepName &&
    !!courseName &&
    !!durationHours &&
    !!thematicAreaCode &&
    !!thematicAreaLabel &&
    !!agent &&
    !!instructorName;

  return {
    applicable: true,
    notApplicableReason: null,
    completed,
    missing,
    ready,
    data: ready
      ? {
          workerName: workerName!,
          workerCurp: curp!,
          occupationCode: occupationCode!,
          occupationLabel: occupationLabel!,
          jobPosition,
          employerName: employerName!,
          employerRfc: employerRfc!,
          legalRepName: legalRepName!,
          workersRepName,
          courseName: courseName!,
          durationHours: durationHours!,
          startDate: startDate!,
          endDate: endDate!,
          thematicAreaCode: thematicAreaCode!,
          thematicAreaLabel: thematicAreaLabel!,
          trainingAgentName: agent!.name,
          trainingAgentRegistry: clean(agent!.stpsRegistry),
          instructorName: instructorName!,
        }
      : null,
  };
}

/** Selector de Prisma que alimenta `evaluateDc3` sin traer de más. */
export const DC3_SOURCE_INCLUDE = {
  student: {
    select: {
      id: true,
      name: true,
      companyId: true,
      dc3FullName: true,
      curp: true,
      dc3OccupationCode: true,
      dc3JobPosition: true,
      company: {
        select: {
          id: true,
          name: true,
          dc3LegalName: true,
          dc3Rfc: true,
          dc3LegalRepName: true,
          dc3WorkersRepName: true,
        },
      },
    },
  },
  course: {
    select: {
      id: true,
      title: true,
      dc3Enabled: true,
      dc3CourseName: true,
      dc3ThematicAreaCode: true,
      dc3DurationHours: true,
      dc3DeliveryMode: true,
      dc3InstructorName: true,
      dc3TrainingAgent: { select: { name: true, stpsRegistry: true } },
      // "¿Este curso tiene examen final?" en una sola fila. El examen
      // cuelga de lección → módulo → curso, así que preguntarlo por el
      // camino natural traería una fila por lección de cada curso, y esta
      // consulta se usa sobre listados de cientos de inscripciones. Aquí
      // basta con saber si existe: se filtra el módulo que lo contiene y
      // se corta en uno.
      modules: {
        where: { lessons: { some: { quizzes: { some: { isFinalExam: true } } } } },
        select: { id: true },
        take: 1,
      },
    },
  },
  quizAttempts: {
    where: { passed: true, quiz: { isFinalExam: true } },
    select: { id: true },
    take: 1,
  },
  dc3Edition: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      durationHours: true,
      instructorName: true,
    },
  },
} as const;

type EnrollmentWithDc3Source = {
  id: string;
  status: string;
  enrolledAt: Date;
  completedAt: Date | null;
  student: Dc3Source["user"] & { company: Dc3Source["company"] };
  course: Omit<Dc3Source["course"], "hasFinalExam"> & {
    modules: { id: string }[];
  };
  quizAttempts: { id: string }[];
  dc3Edition: Dc3Source["edition"];
};

/** Adapta el resultado de `DC3_SOURCE_INCLUDE` a `evaluateDc3`. */
export function evaluateDc3ForEnrollment(
  enrollment: EnrollmentWithDc3Source
): Dc3Readiness {
  return evaluateDc3({
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      // El include ya filtró por `passed` y `isFinalExam`: que haya
      // alguna fila es exactamente "aprobó el examen final".
      passedFinalExam: enrollment.quizAttempts.length > 0,
    },
    user: enrollment.student,
    company: enrollment.student.company,
    course: {
      ...enrollment.course,
      // Igual: el include sólo trae el módulo que contiene el examen
      // final, si lo hay.
      hasFinalExam: enrollment.course.modules.length > 0,
    },
    edition: enrollment.dc3Edition,
  });
}
