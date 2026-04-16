import { generateText, SYSTEM_PROMPTS } from "@prol/ai";

export interface GenerateLessonContentInput {
  lessonTitle: string;
  lessonType: "TEXT" | "QUIZ" | "ASSIGNMENT";
  moduleTitle: string;
  courseTitle: string;
  courseDescription?: string;
  previousLessonTitles?: string[];
}

export interface LessonContentResult {
  content: string;
  type: "TEXT" | "QUIZ" | "ASSIGNMENT";
}

/**
 * Generate content for a text, quiz, or assignment lesson.
 */
export async function generateLessonContent(
  input: GenerateLessonContentInput
): Promise<LessonContentResult> {
  const { lessonTitle, lessonType, moduleTitle, courseTitle, courseDescription, previousLessonTitles } = input;

  const previousContext = previousLessonTitles?.length
    ? `\nLECCIONES ANTERIORES: ${previousLessonTitles.join(", ")}`
    : "";

  let typeInstructions: string;
  switch (lessonType) {
    case "TEXT":
      typeInstructions = `Genera una lección de texto educativa completa con:
- Introducción al tema
- Desarrollo del contenido con secciones claras
- Ejemplos prácticos
- Puntos clave / resumen
- Formato: Markdown`;
      break;
    case "QUIZ":
      typeInstructions = `Genera un quiz con 5-10 preguntas sobre el tema.
Formato JSON con estructura:
{ "questions": [{ "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "..." }] }`;
      break;
    case "ASSIGNMENT":
      typeInstructions = `Genera una tarea práctica con:
- Objetivo de aprendizaje
- Instrucciones detalladas paso a paso
- Criterios de evaluación
- Recursos o referencias sugeridas
- Formato: Markdown`;
      break;
  }

  const userPrompt = `Genera el contenido para la siguiente lección:

CURSO: ${courseTitle}
${courseDescription ? `DESCRIPCIÓN: ${courseDescription}` : ""}
MÓDULO: ${moduleTitle}
LECCIÓN: ${lessonTitle}
TIPO: ${lessonType}${previousContext}

${typeInstructions}`;

  const content = await generateText({
    systemPrompt: SYSTEM_PROMPTS.LESSON_CONTENT,
    userPrompt,
    maxTokens: 6144,
    temperature: 0.7,
  });

  return { content, type: lessonType };
}
