import { generateJSON } from "@prol/ai";
import {
  coherenceReportSchema,
  type CoherenceReport,
  type CourseOutlineV2,
} from "./schema";

const SYSTEM_PROMPT = `Eres un auditor de diseño instruccional. Revisas el outline de un curso y reportas únicamente los issues que detectes — NO reescribes nada.

Categorías a detectar:
- objective_uncovered: objetivo de aprendizaje sin lección que lo cubra.
- lesson_misplaced: lección que ya no encaja con el objetivo de su módulo.
- difficulty_jump: salto de dificultad abrupto (más de 2 niveles entre módulos consecutivos).
- content_duplication: dos lecciones cubren lo mismo.
- duration_mismatch: duración total del curso no coincide con la suma de módulos, o módulos con duración irreal.
- missing_evaluation: módulos sin evaluación cuando el curso lo requiere.
- other: cualquier otra inconsistencia relevante.

Severidades:
- error: bloqueante, el curso no se puede publicar así.
- warning: debería corregirse pero no bloquea.
- info: sugerencia de mejora.

Si el outline está bien, devuelve "issues": [] y un "summary" positivo.`;

export async function checkCoherence(
  outline: CourseOutlineV2
): Promise<CoherenceReport> {
  const userPrompt = `Analiza el siguiente outline y reporta issues. Sé conciso.

OUTLINE:
${JSON.stringify(outline, null, 2)}

Devuelve JSON:
{
  "issues": [
    { "severity": "error|warning|info", "category": "...", "target": "mod-1|lec-1-2|null", "message": "...", "suggestion": "..." }
  ],
  "summary": "..."
}`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: coherenceReportSchema,
    maxTokens: 2000,
    temperature: 0.3,
    model: "claude-haiku-4-5",
  });
}
