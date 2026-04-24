import { generateJSON } from "@prol/ai";
import { moduleV2Schema, type CourseOutlineV2, type ModuleV2 } from "./schema";

const SYSTEM_PROMPT = `Regeneras UN módulo completo dentro de un curso existente. Reemplazas todas sus lecciones pero conservas el objetivo del módulo y su lugar en la progresión del curso.

Reglas:
- Conserva "id" y "number" del módulo.
- Respeta la duración total del módulo (suma de durationMin de lecciones).
- No dupliques contenido con módulos adyacentes.
- Todo en español.`;

export interface RegenerateModuleInput {
  outline: CourseOutlineV2;
  moduleId: string;
  feedback?: string;
  preserveLessonCount?: boolean;
}

export async function regenerateModule(
  input: RegenerateModuleInput
): Promise<ModuleV2> {
  const idx = input.outline.modules.findIndex((m) => m.id === input.moduleId);
  if (idx === -1) throw new Error(`Module ${input.moduleId} not found`);

  const current = input.outline.modules[idx]!;
  const prev = idx > 0 ? input.outline.modules[idx - 1] : null;
  const next =
    idx < input.outline.modules.length - 1
      ? input.outline.modules[idx + 1]
      : null;

  const userPrompt = `CONTEXTO DEL CURSO:
Título: ${input.outline.titleSuggested}
Audiencia: ${input.outline.generationMetadata.inputsUsed.audience}
Nivel: ${input.outline.generationMetadata.inputsUsed.level}
Promesa: ${input.outline.transformationPromise}

MÓDULO ANTERIOR: ${prev ? `${prev.title} — ${prev.moduleObjective}` : "(este es el primer módulo)"}
MÓDULO SIGUIENTE: ${next ? `${next.title} — ${next.moduleObjective}` : "(este es el último módulo)"}

MÓDULO A REGENERAR:
${JSON.stringify(current, null, 2)}

${input.feedback ? `FEEDBACK DEL PROFESOR: ${input.feedback}` : "(Sin feedback específico)"}
${input.preserveLessonCount ? `Mantén ${current.lessons.length} lecciones.` : "Puedes ajustar el número de lecciones si es pedagógicamente mejor."}

Devuelve un JSON con el módulo regenerado siguiendo el mismo formato que el original (con id "${current.id}", number ${current.number}).`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: moduleV2Schema,
    maxTokens: 5000,
    temperature: 0.7,
  });
}

export function applyModuleReplacement(
  outline: CourseOutlineV2,
  replacement: ModuleV2
): CourseOutlineV2 {
  return {
    ...outline,
    modules: outline.modules.map((m) =>
      m.id === replacement.id ? replacement : m
    ),
  };
}
