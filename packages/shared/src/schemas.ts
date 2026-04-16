import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Validators
// ─────────────────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Debe ser un color hexadecimal válido");

// ─────────────────────────────────────────────────────────────────────────────
// Course Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(120, "El título no puede exceder 120 caracteres"),
  description: z
    .string()
    .max(5000, "La descripción no puede exceder 5000 caracteres")
    .optional(),
  priceInCents: z
    .number()
    .int("El precio debe ser un número entero (centavos)")
    .min(0, "El precio no puede ser negativo"),
  currency: z.string().length(3, "El código de moneda debe ser de 3 caracteres").default("MXN"),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = createCourseSchema.partial();

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Lesson Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede exceder 200 caracteres"),
  type: z.enum(["VIDEO", "TEXT", "QUIZ", "ASSIGNMENT"]),
  position: z.number().int().min(0),
  content: z.unknown().optional(),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Stop Schemas
// ─────────────────────────────────────────────────────────────────────────────

const questionContentSchema = z.object({
  type: z.literal("QUESTION"),
  question: z.string().min(1, "La pregunta es requerida"),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        isCorrect: z.boolean(),
      })
    )
    .min(2, "Debe haber al menos 2 opciones"),
  explanation: z.string().nullable().optional(),
});

const reflectionContentSchema = z.object({
  type: z.literal("REFLECTION"),
  prompt: z.string().min(1, "El prompt de reflexión es requerido"),
  minLength: z.number().int().min(0).nullable().optional(),
});

const exerciseContentSchema = z.object({
  type: z.literal("EXERCISE"),
  instructions: z.string().min(1, "Las instrucciones son requeridas"),
  hints: z.array(z.string()).default([]),
  sampleAnswer: z.string().nullable().optional(),
});

const pollContentSchema = z.object({
  type: z.literal("POLL"),
  question: z.string().min(1, "La pregunta es requerida"),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
      })
    )
    .min(2, "Debe haber al menos 2 opciones"),
  allowMultiple: z.boolean().default(false),
});

const interactiveStopContentSchema = z.discriminatedUnion("type", [
  questionContentSchema,
  reflectionContentSchema,
  exerciseContentSchema,
  pollContentSchema,
]);

export const createInteractiveStopSchema = z.object({
  timestampSeconds: z.number().int().min(0, "El timestamp debe ser positivo"),
  type: z.enum(["QUESTION", "REFLECTION", "EXERCISE", "POLL"]),
  content: interactiveStopContentSchema,
  isRequired: z.boolean().default(true),
});

export type CreateInteractiveStopInput = z.infer<typeof createInteractiveStopSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Enrollment Schema
// ─────────────────────────────────────────────────────────────────────────────

export const enrollStudentSchema = z.object({
  courseId: z.string().cuid("ID de curso inválido"),
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Settings Schema
// ─────────────────────────────────────────────────────────────────────────────

export const tenantSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  primaryColor: hexColor.default("#6366f1"),
  accentColor: hexColor.default("#f59e0b"),
  contactEmail: z.string().email("Email de contacto inválido").optional(),
  phone: z
    .string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .optional(),
  logo: z.string().url("URL de logo inválida").nullable().optional(),
  favicon: z.string().url("URL de favicon inválida").nullable().optional(),
  customCss: z.string().max(10000, "El CSS personalizado no puede exceder 10000 caracteres").nullable().optional(),
  socialLinks: z
    .object({
      facebook: z.string().url().optional(),
      instagram: z.string().url().optional(),
      twitter: z.string().url().optional(),
      youtube: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      tiktok: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
  workshopsEnabled: z.boolean().optional(),
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Schema
// ─────────────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
