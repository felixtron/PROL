import { generateJSON } from "@prol/ai";
import { z } from "zod";
import { lessonV2Schema, type CourseOutlineV2, type LessonV2 } from "./schema";

const SYSTEM_PROMPT = `Regeneras UNA lección dentro de un curso existente. Mantienes el objetivo pedagógico y la posición; cambias contenido según el feedback del profesor.

Reglas:
- Conserva el mismo "id", "number", y "durationMin" de la lección original.
- Respeta el objetivo del módulo al que pertenece.
- No dupliques contenido de las lecciones adyacentes (anterior y siguiente).
- Devuelve 2 alternativas distintas para que el profesor elija.
- Todo en español.`;

export const regenerateLessonResultSchema = z.object({
  alternatives: z.array(lessonV2Schema).length(2),
});

export type RegenerateLessonResult = z.infer<
  typeof regenerateLessonResultSchema
>;

export interface RegenerateLessonInput {
  outline: CourseOutlineV2;
  moduleId: string;
  lessonId: string;
  feedback?: string;
}

export async function regenerateLesson(
  input: RegenerateLessonInput
): Promise<RegenerateLessonResult> {
  const module = input.outline.modules.find((m) => m.id === input.moduleId);
  if (!module) throw new Error(`Module ${input.moduleId} not found`);
  const lessonIdx = module.lessons.findIndex((l) => l.id === input.lessonId);
  if (lessonIdx === -1) throw new Error(`Lesson ${input.lessonId} not found`);

  const current = module.lessons[lessonIdx]!;
  const prev = lessonIdx > 0 ? module.lessons[lessonIdx - 1] : null;
  const next =
    lessonIdx < module.lessons.length - 1
      ? module.lessons[lessonIdx + 1]
      : null;

  const userPrompt = `CONTEXTO DEL CURSO:
Título: ${input.outline.titleSuggested}
Audiencia: ${input.outline.generationMetadata.inputsUsed.audience}
Nivel: ${input.outline.generationMetadata.inputsUsed.level}

MÓDULO AL QUE PERTENECE LA LECCIÓN:
Título: ${module.title}
Objetivo: ${module.moduleObjective}

LECCIÓN ANTERIOR: ${prev ? `${prev.title} — ${prev.summary}` : "(ninguna)"}
LECCIÓN SIGUIENTE: ${next ? `${next.title} — ${next.summary}` : "(ninguna)"}

LECCIÓN ACTUAL A REGENERAR:
${JSON.stringify(current, null, 2)}

${input.feedback ? `FEEDBACK DEL PROFESOR: ${input.feedback}` : "(Sin feedback específico — mejora la lección en general)"}

Devuelve un JSON con 2 alternativas en este formato:
{
  "alternatives": [
    { ...lección 1 con mismo id, number, durationMin pero nuevo contenido... },
    { ...lección 2 diferente a la 1, alternativa distinta... }
  ]
}`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: regenerateLessonResultSchema,
    maxTokens: 3000,
    temperature: 0.8,
  });
}

/**
 * Pure helper: returns a new outline with the given lesson replaced.
 */
export function applyLessonReplacement(
  outline: CourseOutlineV2,
  moduleId: string,
  replacement: LessonV2
): CourseOutlineV2 {
  return {
    ...outline,
    modules: outline.modules.map((m) =>
      m.id !== moduleId
        ? m
        : {
            ...m,
            lessons: m.lessons.map((l) =>
              l.id === replacement.id ? replacement : l
            ),
          }
    ),
  };
}
