import { generateJSON } from "@prol/ai";
import { courseOutlineV2Schema, type CourseOutlineV2, type RefinementAnswers } from "./schema";

const SYSTEM_PROMPT = `Eres un diseñador instruccional experto que genera esqueletos de cursos online siguiendo principios probados:

1. BACKWARD DESIGN: parte del objetivo de transformación y diseña hacia atrás.
2. PROGRESIÓN: cada módulo construye sobre el anterior, de simple a complejo.
3. ESPECIFICIDAD: títulos de lección accionables, no genéricos. "Cómo configurar tu primera campaña" supera a "Introducción a campañas".
4. RITMO: cada lección cabe en la duración indicada; si un tema es grande, divídelo.
5. APLICACIÓN: al menos una lección práctica o ejercicio por módulo.

Reglas estrictas:
- Usa IDs estables: "mod-1", "mod-2"... y "lec-1-1", "lec-1-2", "lec-2-1"...
- No inventes datos específicos (estadísticas, nombres de herramientas poco conocidas) sin estar seguro. Si dudas, omite.
- Si el nivel es "beginner/Principiante", la primera lección del módulo 1 SIEMPRE debe bajar la barrera de entrada (motivación + orientación).
- Respeta el número de módulos y lecciones/módulo solicitado. Si es pedagógicamente incorrecto, incluye una advertencia en "generationMetadata.unresolvedWarnings".
- Todo en español.
- Cada lección debe tener 3 a 5 "keyPoints" — puntos clave que el profesor desarrollará.
- Marca el "bloom" de cada lección (recordar, comprender, aplicar, analizar, evaluar, crear) — asegura progresión.`;

export interface GenerateOutlineV2Input {
  topic: string;
  audience: string;
  level: "beginner" | "intermediate" | "advanced";
  moduleCount: number;
  lessonsPerModule: number;
  language?: string;
  refinement?: RefinementAnswers;
}

export async function generateOutlineV2(
  input: GenerateOutlineV2Input
): Promise<CourseOutlineV2> {
  const refinementBlock = input.refinement
    ? buildRefinementBlock(input.refinement)
    : "";

  const userPrompt = `Genera el outline completo del siguiente curso.

BRIEFING:
TEMA: ${input.topic}
AUDIENCIA: ${input.audience}
NIVEL: ${input.level}
MÓDULOS: ${input.moduleCount}
LECCIONES POR MÓDULO: ${input.lessonsPerModule}
IDIOMA: ${input.language ?? "español"}
${refinementBlock}

Devuelve un JSON con este formato exacto (sin ningún texto fuera del JSON):
{
  "version": 2,
  "generatedAt": "${new Date().toISOString()}",
  "titleSuggested": "...",
  "titleAlternatives": ["...", "..."],
  "shortDescription": "...",
  "longDescription": "...",
  "transformationPromise": "Al finalizar, el alumno habrá...",
  "learningObjectives": [
    { "id": "obj-1", "text": "...", "bloom": "aplicar" }
  ],
  "prerequisites": ["..."],
  "totalDurationMin": 480,
  "difficultyProgression": [1, 2, 3, 4, 3],
  "modules": [
    {
      "id": "mod-1",
      "number": 1,
      "title": "...",
      "moduleObjective": "...",
      "durationMin": 90,
      "prerequisiteOf": ["mod-2"],
      "coversObjectives": ["obj-1"],
      "lessons": [
        {
          "id": "lec-1-1",
          "number": 1,
          "title": "...",
          "type": "VIDEO|TEXT|QUIZ|ASSIGNMENT",
          "durationMin": 15,
          "summary": "...",
          "keyPoints": ["...", "..."],
          "deliverable": null,
          "suggestedResources": ["..."],
          "bloom": "comprender"
        }
      ],
      "evaluation": { "type": "quiz|assignment|none", "description": "...", "durationMin": 10 }
    }
  ],
  "finalProject": { "title": "...", "description": "...", "evaluationCriteria": ["..."] },
  "generationMetadata": {
    "model": "claude-sonnet-4-5",
    "inputsUsed": { "topic": "${escapeJson(input.topic)}", "audience": "${escapeJson(input.audience)}", "level": "${input.level}" },
    "unresolvedWarnings": []
  }
}`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: courseOutlineV2Schema,
    maxTokens: 8192,
    temperature: 0.7,
  });
}

function buildRefinementBlock(r: RefinementAnswers): string {
  const lines: string[] = ["\nREFINAMIENTO VALIDADO POR EL PROFESOR:"];
  const inf = r.inferences;
  if (inf.transformationObjective)
    lines.push(`- Objetivo de transformación: ${inf.transformationObjective.value}`);
  if (inf.totalDurationHours)
    lines.push(`- Duración total: ${inf.totalDurationHours.value} horas`);
  if (inf.formatSuggested) lines.push(`- Formato: ${inf.formatSuggested.value}`);
  if (inf.toneSuggested) lines.push(`- Tono: ${inf.toneSuggested.value}`);
  if (inf.practicalRatio)
    lines.push(`- Ratio práctico/teórico: ${inf.practicalRatio.value}% práctico`);
  if (inf.evaluationSuggested)
    lines.push(`- Evaluación: ${inf.evaluationSuggested.value}`);
  if (inf.priorKnowledgeAssumed?.length)
    lines.push(`- Conocimientos previos: ${inf.priorKnowledgeAssumed.join(", ")}`);

  if (Object.keys(r.answers).length) {
    lines.push("\nRespuestas a preguntas críticas:");
    for (const [qid, answer] of Object.entries(r.answers)) {
      const formatted = Array.isArray(answer) ? answer.join(", ") : answer;
      lines.push(`- ${qid}: ${formatted}`);
    }
  }
  return lines.join("\n");
}

function escapeJson(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
