import { generateJSON, SYSTEM_PROMPTS } from "@prol/ai";
import { db } from "@prol/db";
import { z } from "zod";

const suggestionSchema = z.object({
  type: z.enum(["ADD_LESSON", "ADD_MODULE", "REORDER", "IMPROVE_CONTENT", "ADD_QUIZ", "ADD_ASSIGNMENT"]),
  title: z.string(),
  description: z.string(),
  targetModule: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

const enrichmentResultSchema = z.object({
  suggestions: z.array(suggestionSchema),
  missingTopics: z.array(z.string()),
  overallAssessment: z.string(),
});

export type CourseEnrichmentResult = z.infer<typeof enrichmentResultSchema>;
export type EnrichmentSuggestion = z.infer<typeof suggestionSchema>;

/**
 * Analyze an existing course and suggest improvements.
 */
export async function enrichCourse(courseId: string): Promise<CourseEnrichmentResult> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          lessons: {
            orderBy: { position: "asc" },
            select: { title: true, type: true, content: true },
          },
        },
      },
    },
  });

  if (!course) throw new Error("Curso no encontrado");

  const courseStructure = course.modules.map((m) => ({
    module: m.title,
    description: m.description,
    lessons: m.lessons.map((l) => ({
      title: l.title,
      type: l.type,
      hasContent: !!l.content,
    })),
  }));

  const userPrompt = `Analiza el siguiente curso y sugiere mejoras:

TÍTULO: ${course.title}
DESCRIPCIÓN: ${course.description ?? "Sin descripción"}
CATEGORÍA: ${course.category ?? "Sin categoría"}

ESTRUCTURA ACTUAL:
${JSON.stringify(courseStructure, null, 2)}

Identifica:
1. Temas importantes que faltan
2. Oportunidades para mejorar la estructura
3. Sugerencias específicas de contenido adicional
4. Áreas donde agregar quizzes o tareas prácticas

Responde SOLO con JSON válido.`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPTS.COURSE_ENRICHMENT,
    userPrompt,
    schema: enrichmentResultSchema,
    maxTokens: 4096,
    temperature: 0.7,
  });
}
