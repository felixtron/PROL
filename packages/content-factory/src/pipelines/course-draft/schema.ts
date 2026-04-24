import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// CourseOutline V2 — the canonical structure persisted in CourseDraft.outline
// ─────────────────────────────────────────────────────────────────────────────

export const bloomLevelSchema = z.enum([
  "recordar",
  "comprender",
  "aplicar",
  "analizar",
  "evaluar",
  "crear",
]);

export const lessonTypeSchema = z.enum([
  "VIDEO",
  "TEXT",
  "QUIZ",
  "ASSIGNMENT",
  "MULTI",
]);

export const lessonV2Schema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: z.string().min(1),
  type: lessonTypeSchema,
  durationMin: z.number().int().positive(),
  summary: z.string(),
  keyPoints: z.array(z.string()).min(1).max(7),
  deliverable: z.string().nullable(),
  suggestedResources: z.array(z.string()).default([]),
  bloom: bloomLevelSchema,
});

export const moduleV2Schema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: z.string().min(1),
  moduleObjective: z.string(),
  durationMin: z.number().int().positive(),
  prerequisiteOf: z.array(z.string()).default([]),
  coversObjectives: z.array(z.string()).default([]),
  lessons: z.array(lessonV2Schema).min(1),
  evaluation: z
    .object({
      type: z.enum(["quiz", "assignment", "none"]),
      description: z.string(),
      durationMin: z.number().int().nonnegative(),
    })
    .optional(),
});

export const learningObjectiveSchema = z.object({
  id: z.string(),
  text: z.string(),
  bloom: bloomLevelSchema,
});

export const courseOutlineV2Schema = z.object({
  version: z.literal(2),
  generatedAt: z.string(),
  titleSuggested: z.string().min(1),
  titleAlternatives: z.array(z.string()).default([]),
  shortDescription: z.string(),
  longDescription: z.string(),
  transformationPromise: z.string(),
  learningObjectives: z.array(learningObjectiveSchema).min(1),
  prerequisites: z.array(z.string()).default([]),
  totalDurationMin: z.number().int().positive(),
  difficultyProgression: z.array(z.number().int().min(1).max(5)),
  modules: z.array(moduleV2Schema).min(1),
  finalProject: z
    .object({
      title: z.string(),
      description: z.string(),
      evaluationCriteria: z.array(z.string()),
    })
    .optional()
    .nullable(),
  generationMetadata: z.object({
    model: z.string(),
    inputsUsed: z.object({
      topic: z.string(),
      audience: z.string(),
      level: z.string(),
    }),
    unresolvedWarnings: z.array(z.string()).default([]),
  }),
});

export type CourseOutlineV2 = z.infer<typeof courseOutlineV2Schema>;
export type ModuleV2 = z.infer<typeof moduleV2Schema>;
export type LessonV2 = z.infer<typeof lessonV2Schema>;
export type LearningObjective = z.infer<typeof learningObjectiveSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — refinement schema
// ─────────────────────────────────────────────────────────────────────────────

const confidenceSchema = z.enum(["alta", "media", "baja"]);

const inferenceSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: confidenceSchema,
    reasoning: z.string().optional(),
  });

export const refinementSchema = z.object({
  inferences: z.object({
    transformationObjective: inferenceSchema(z.string()),
    totalDurationHours: inferenceSchema(z.number().positive()),
    formatSuggested: inferenceSchema(
      z.enum(["video", "video+practica", "texto", "mixto", "en_vivo"])
    ),
    toneSuggested: inferenceSchema(
      z.enum([
        "formal",
        "cercano",
        "motivacional",
        "cercano-motivacional",
        "tecnico",
      ])
    ),
    practicalRatio: inferenceSchema(z.number().min(0).max(100)),
    evaluationSuggested: inferenceSchema(
      z.enum(["quiz", "proyecto_final", "ejercicios", "ninguna"])
    ),
    priorKnowledgeAssumed: z.array(z.string()).default([]),
  }),
  criticalQuestions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        type: z.enum(["single_choice", "multi_choice", "text", "slider"]),
        options: z.array(z.string()).optional(),
        optional: z.boolean().default(false),
        impact: z.string(),
      })
    )
    .max(4),
  warnings: z.array(z.string()).default([]),
});

export type Refinement = z.infer<typeof refinementSchema>;

// User's answers to refinement questions are free-form JSON keyed by question id.
export const refinementAnswersSchema = z.object({
  inferences: refinementSchema.shape.inferences.partial(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
});

export type RefinementAnswers = z.infer<typeof refinementAnswersSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — coherence check
// ─────────────────────────────────────────────────────────────────────────────

export const coherenceIssueSchema = z.object({
  severity: z.enum(["info", "warning", "error"]),
  category: z.enum([
    "objective_uncovered",
    "lesson_misplaced",
    "difficulty_jump",
    "content_duplication",
    "duration_mismatch",
    "missing_evaluation",
    "other",
  ]),
  target: z.string().optional(),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const coherenceReportSchema = z.object({
  issues: z.array(coherenceIssueSchema),
  summary: z.string(),
});

export type CoherenceIssue = z.infer<typeof coherenceIssueSchema>;
export type CoherenceReport = z.infer<typeof coherenceReportSchema>;
