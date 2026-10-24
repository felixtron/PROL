/**
 * Secciones del panel del alumno que el administrador de la academia puede
 * mostrar u ocultar. Una preferencia ausente significa visible: así una
 * academia que ya existe no cambia de aspecto hasta que alguien apague algo.
 *
 * Configuración y notificaciones no están aquí. Son la cuenta, no una
 * herramienta de estudio, y apagarlas dejaría al alumno sin salida.
 */

export const STUDENT_TOOL_IDS = [
  "home",
  "courses",
  "company",
  "workshops",
  "manuals",
  "documents",
  "agenda",
  "advisory",
  "surveys",
  "certificates",
  "help",
  "dc3",
] as const;

export type StudentToolId = (typeof STUDENT_TOOL_IDS)[number];

export interface StudentToolDefinition {
  id: StudentToolId;
  label: string;
  description: string;
  href: string;
  icon:
    | "Home"
    | "BookOpen"
    | "Building2"
    | "Calendar"
    | "FileCheck2"
    | "CalendarClock"
    | "Laptop"
    | "ListChecks"
    | "Award"
    | "HelpCircle"
    | "FileText";
  match: "exact" | "prefix";
  mobilePrimary?: boolean;
  /** Hijos del grupo de gestión documental. */
  group?: "documents";
  requiresModule?: "documents" | "advisory" | "surveys";
  requiresCompany?: boolean;
}

export const STUDENT_TOOLS: readonly StudentToolDefinition[] = [
  {
    id: "home",
    label: "Inicio",
    description: "Resumen del avance y accesos rápidos.",
    href: "/dashboard",
    icon: "Home",
    match: "exact",
    mobilePrimary: true,
  },
  {
    id: "courses",
    label: "Mis Cursos",
    description: "Cursos en los que el alumno está inscrito.",
    href: "/dashboard/courses",
    icon: "BookOpen",
    match: "prefix",
    mobilePrimary: true,
  },
  {
    id: "company",
    label: "Mi Empresa",
    description: "Empresa, equipo e invitaciones.",
    href: "/dashboard/company",
    icon: "Building2",
    match: "prefix",
  },
  {
    id: "workshops",
    label: "Talleres",
    description: "Sesiones presenciales y virtuales.",
    href: "/dashboard/workshops",
    icon: "Calendar",
    match: "prefix",
    mobilePrimary: true,
  },
  {
    id: "manuals",
    label: "Proyectos",
    description: "Proyectos de gestión documental de su empresa.",
    href: "/dashboard/manuals",
    icon: "Building2",
    match: "prefix",
    group: "documents",
    requiresModule: "documents",
    requiresCompany: true,
  },
  {
    id: "documents",
    label: "Documentos",
    description: "Documentos publicados para su empresa.",
    href: "/dashboard/documents",
    icon: "FileCheck2",
    match: "prefix",
    group: "documents",
    requiresModule: "documents",
    requiresCompany: true,
  },
  {
    id: "agenda",
    label: "Agenda",
    description: "Actividades de cumplimiento de su empresa.",
    href: "/dashboard/agenda",
    icon: "CalendarClock",
    match: "prefix",
    group: "documents",
    requiresModule: "documents",
    requiresCompany: true,
  },
  {
    id: "advisory",
    label: "Consultoría Online",
    description: "Sesiones de asesoría con su consultor.",
    href: "/dashboard/advisory",
    icon: "Laptop",
    match: "prefix",
    requiresModule: "advisory",
  },
  {
    id: "surveys",
    label: "Encuestas",
    description: "Encuestas de satisfacción que tiene asignadas.",
    href: "/dashboard/surveys",
    icon: "ListChecks",
    match: "prefix",
    requiresModule: "surveys",
  },
  {
    id: "certificates",
    label: "Diplomas",
    description: "Diplomas de los cursos que completó.",
    href: "/dashboard/certificates",
    icon: "Award",
    match: "prefix",
    mobilePrimary: true,
  },
  {
    id: "help",
    label: "Ayuda",
    description: "Base de ayuda de la plataforma.",
    href: "/dashboard/docs",
    icon: "HelpCircle",
    match: "prefix",
  },
  {
    id: "dc3",
    label: "Constancias DC-3",
    description: "Constancias DC-3 de su empresa.",
    href: "/dashboard/dc3",
    icon: "FileText",
    match: "prefix",
    requiresCompany: true,
  },
];

const SETTINGS_HREF = "/dashboard/settings";

const ALWAYS_OPEN = ["/dashboard/settings", "/dashboard/notifications"] as const;

export interface StudentPanelContext {
  preferences: unknown;
  documentsEnabled: boolean;
  advisoryEnabled: boolean;
  surveysEnabled: boolean;
  hasCompany: boolean;
}

export function isKnownStudentToolId(id: string): id is StudentToolId {
  return (STUDENT_TOOL_IDS as readonly string[]).includes(id);
}

export function parseStudentToolPreferences(
  value: unknown,
): Partial<Record<StudentToolId, boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const parsed: Partial<Record<StudentToolId, boolean>> = {};
  for (const id of STUDENT_TOOL_IDS) {
    if (typeof record[id] === "boolean") parsed[id] = record[id];
  }
  return parsed;
}

export function setStudentToolPreference(
  current: unknown,
  id: string,
  enabled: boolean,
): Partial<Record<StudentToolId, boolean>> {
  if (!isKnownStudentToolId(id)) {
    throw new Error("Herramienta desconocida");
  }
  return { ...parseStudentToolPreferences(current), [id]: enabled };
}

export function isStudentToolVisible(
  ctx: StudentPanelContext,
  id: StudentToolId,
): boolean {
  const tool = STUDENT_TOOLS.find((item) => item.id === id);
  if (!tool) return false;
  if (parseStudentToolPreferences(ctx.preferences)[id] === false) return false;
  if (tool.requiresModule === "documents" && !ctx.documentsEnabled) return false;
  if (tool.requiresModule === "advisory" && !ctx.advisoryEnabled) return false;
  if (tool.requiresModule === "surveys" && !ctx.surveysEnabled) return false;
  if (tool.requiresCompany && !ctx.hasCompany) return false;
  return true;
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function matches(pathname: string, href: string, match: "exact" | "prefix"): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isStudentPathAllowed(
  pathname: string,
  ctx: StudentPanelContext,
): boolean {
  const path = normalizePath(pathname);
  if (ALWAYS_OPEN.some((href) => matches(path, href, "prefix"))) return true;

  if (matches(path, "/dashboard/evaluations", "prefix")) {
    return (
      isStudentToolVisible(ctx, "company") || isStudentToolVisible(ctx, "manuals")
    );
  }
  if (matches(path, "/dashboard/risk", "prefix")) {
    return isStudentToolVisible(ctx, "manuals");
  }

  const ranked = [...STUDENT_TOOLS].sort((a, b) => b.href.length - a.href.length);
  for (const tool of ranked) {
    if (matches(path, tool.href, tool.match)) {
      return isStudentToolVisible(ctx, tool.id);
    }
  }
  return true;
}

export function firstAllowedStudentHref(ctx: StudentPanelContext): string {
  const visible = STUDENT_TOOLS.find((tool) => isStudentToolVisible(ctx, tool.id));
  return visible?.href ?? SETTINGS_HREF;
}

export function studentMobilePrimaryHrefs(ctx: StudentPanelContext): string[] {
  return STUDENT_TOOLS.filter(
    (tool) => tool.mobilePrimary && isStudentToolVisible(ctx, tool.id),
  ).map((tool) => tool.href);
}
