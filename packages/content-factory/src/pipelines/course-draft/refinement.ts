import { generateJSON } from "@prol/ai";
import { refinementSchema, type Refinement } from "./schema";

const SYSTEM_PROMPT = `Eres un diseñador instruccional experto que ayuda a profesores a crear cursos online efectivos.

Tu tarea en este paso es el REFINAMIENTO: a partir de un briefing mínimo (tema, audiencia, nivel, cantidad de módulos y lecciones), infieres los parámetros pedagógicos del curso y formulas 2 a 4 preguntas clave que el profesor debe responder para que el outline final sea el adecuado.

NO generes el outline todavía. Solo infiere y pregunta.

Reglas:
- Las inferencias deben declarar su nivel de confianza (alta / media / baja).
- Las preguntas deben ser LAS QUE MÁS IMPACTAN el outline final — no hagas preguntas de poco impacto.
- Detecta incoherencias en el briefing y repórtalas en "warnings" (ej: "25 lecciones en 8 horas = 19 min/lección, demasiado fragmentado").
- Todo en español.`;

export interface GenerateRefinementInput {
  topic: string;
  audience: string;
  level: "beginner" | "intermediate" | "advanced";
  moduleCount: number;
  lessonsPerModule: number;
  language?: string;
}

export async function generateRefinement(
  input: GenerateRefinementInput
): Promise<Refinement> {
  const userPrompt = `Briefing del profesor:
TEMA: ${input.topic}
AUDIENCIA: ${input.audience}
NIVEL: ${input.level}
MÓDULOS: ${input.moduleCount}
LECCIONES POR MÓDULO: ${input.lessonsPerModule}
IDIOMA: ${input.language ?? "español"}

Devuelve un JSON con este formato exacto:
{
  "inferences": {
    "transformationObjective": { "value": "...", "confidence": "alta|media|baja", "reasoning": "..." },
    "totalDurationHours": { "value": 8, "confidence": "..." },
    "formatSuggested": { "value": "video|video+practica|texto|mixto|en_vivo", "confidence": "..." },
    "toneSuggested": { "value": "formal|cercano|motivacional|cercano-motivacional|tecnico", "confidence": "..." },
    "practicalRatio": { "value": 70, "confidence": "..." },
    "evaluationSuggested": { "value": "quiz|proyecto_final|ejercicios|ninguna", "confidence": "..." },
    "priorKnowledgeAssumed": ["...", "..."]
  },
  "criticalQuestions": [
    {
      "id": "slug-sin-espacios",
      "question": "...",
      "type": "single_choice|multi_choice|text|slider",
      "options": ["...", "..."],
      "optional": false,
      "impact": "Explica cómo afecta al outline"
    }
  ],
  "warnings": ["..."]
}

Máximo 4 preguntas. Solo las críticas.`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schema: refinementSchema,
    maxTokens: 2048,
    temperature: 0.5,
    model: "claude-haiku-4-5",
  });
}
