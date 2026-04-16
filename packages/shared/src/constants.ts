// ─────────────────────────────────────────────────────────────────────────────
// Platform Constants
// ─────────────────────────────────────────────────────────────────────────────

export const PLATFORM_NAME = "PROL" as const;
export const DOMAIN = "prol.prosuite.pro" as const;
export const DEFAULT_CURRENCY = "MXN" as const;
export const DEFAULT_REVENUE_SHARE = 0.30;
export const MIN_REVENUE_SHARE = 0.30;
export const TRIAL_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Subdomain
// ─────────────────────────────────────────────────────────────────────────────

/** Builds the full subdomain URL for a tenant. */
export const tenantDomain = (slug: string) => `${slug}.${DOMAIN}` as const;

/** Regex to extract the tenant slug from a hostname. */
export const TENANT_SUBDOMAIN_PATTERN = /^([a-z0-9][a-z0-9-]*[a-z0-9])\.prol\.prosuite\.pro$/;

// ─────────────────────────────────────────────────────────────────────────────
// Route Paths
// ─────────────────────────────────────────────────────────────────────────────

export const ROUTES = {
  // Public / auth
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  CATALOG: "/courses",
  COURSE_DETAIL: (slug: string) => `/courses/${slug}` as const,

  // Student dashboard
  STUDENT: {
    DASHBOARD: "/dashboard",
    MY_COURSES: "/dashboard/courses",
    COURSE: (slug: string) => `/dashboard/courses/${slug}` as const,
    LESSON: (courseSlug: string, lessonId: string) =>
      `/dashboard/courses/${courseSlug}/lessons/${lessonId}` as const,
    CERTIFICATES: "/dashboard/certificates",
    WORKSHOPS: "/dashboard/workshops",
    SETTINGS: "/dashboard/settings",
  },

  // Professor dashboard
  PROFESSOR: {
    DASHBOARD: "/professor",
    COURSES: "/professor/courses",
    COURSE_EDIT: (courseId: string) => `/professor/courses/${courseId}/edit` as const,
    LESSON_EDIT: (courseId: string, lessonId: string) =>
      `/professor/courses/${courseId}/lessons/${lessonId}/edit` as const,
    STUDENTS: "/professor/students",
    ANALYTICS: "/professor/analytics",
    WORKSHOPS: "/professor/workshops",
    SETTINGS: "/professor/settings",
  },

  // Admin dashboard
  ADMIN: {
    DASHBOARD: "/admin",
    COURSES: "/admin/courses",
    USERS: "/admin/users",
    PAYMENTS: "/admin/payments",
    BRANDING: "/admin/branding",
    SETTINGS: "/admin/settings",
    WORKSHOPS: "/admin/workshops",
  },

  // Super admin
  SUPER_ADMIN: {
    DASHBOARD: "/super-admin",
    TENANTS: "/super-admin/tenants",
    TENANT_DETAIL: (tenantId: string) => `/super-admin/tenants/${tenantId}` as const,
    ANALYTICS: "/super-admin/analytics",
    SETTINGS: "/super-admin/settings",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Course Status Labels & Colors
// ─────────────────────────────────────────────────────────────────────────────

export const COURSE_STATUS_LABELS = {
  DRAFT: "Borrador",
  REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
} as const;

export const COURSE_STATUS_COLORS = {
  DRAFT: { bg: "#f3f4f6", text: "#374151" },
  REVIEW: { bg: "#fef3c7", text: "#92400e" },
  PUBLISHED: { bg: "#d1fae5", text: "#065f46" },
  ARCHIVED: { bg: "#e5e7eb", text: "#6b7280" },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Enrollment Status Labels
// ─────────────────────────────────────────────────────────────────────────────

export const ENROLLMENT_STATUS_LABELS = {
  ACTIVE: "Activa",
  COMPLETED: "Completada",
  EXPIRED: "Expirada",
  REFUNDED: "Reembolsada",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Payment Method Labels
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_METHOD_LABELS = {
  CARD: "Tarjeta de crédito/débito",
  OXXO: "OXXO",
  SPEI: "Transferencia SPEI",
} as const;

export const PAYMENT_STATUS_LABELS = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Lesson Type Labels
// ─────────────────────────────────────────────────────────────────────────────

export const LESSON_TYPE_LABELS = {
  VIDEO: "Video",
  TEXT: "Lectura",
  QUIZ: "Examen",
  ASSIGNMENT: "Tarea",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Stop Type Labels
// ─────────────────────────────────────────────────────────────────────────────

export const INTERACTIVE_STOP_TYPE_LABELS = {
  QUESTION: "Pregunta",
  REFLECTION: "Reflexión",
  EXERCISE: "Ejercicio",
  POLL: "Encuesta",
} as const;
