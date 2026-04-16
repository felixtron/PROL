import { generateJSON, SYSTEM_PROMPTS } from "@prol/ai";
import { z } from "zod";

const lessonSchema = z.object({
  title: z.string(),
  type: z.enum(["VIDEO", "TEXT", "QUIZ", "ASSIGNMENT"]),
  description: z.string().optional(),
  estimatedDurationMinutes: z.number().optional(),
});

const moduleSchema = z.object({
  title: z.string(),
  description: z.string(),
  lessons: z.array(lessonSchema),
});

const courseOutlineSchema = z.object({
  title: z.string(),
  description: z.string(),
  modules: z.array(moduleSchema),
});

export type CourseOutline = z.infer<typeof courseOutlineSchema>;
export type CourseOutlineModule = z.infer<typeof moduleSchema>;
export type CourseOutlineLesson = z.infer<typeof lessonSchema>;

export interface GenerateCourseOutlineInput {
  topic: string;
  audience: string;
  moduleCount: number;
  lessonsPerModule: number;
  level?: "beginner" | "intermediate" | "advanced";
  language?: string;
}

export async function generateCourseOutline(
  input: GenerateCourseOutlineInput
): Promise<CourseOutline> {
  const { topic, audience, moduleCount, lessonsPerModule, level = "intermediate", language = "español" } = input;

  const userPrompt = `Genera un esquema completo de curso online con las siguientes especificaciones:

TEMA: ${topic}
AUDIENCIA: ${audience}
NIVEL: ${level}
IDIOMA: ${language}
NÚMERO DE MÓDULOS: ${moduleCount}
LECCIONES POR MÓDULO: ${lessonsPerModule}

El esquema debe incluir:
- Un título atractivo y descriptivo para el curso
- Una descripción del curso (2-3 oraciones)
- ${moduleCount} módulos, cada uno con:
  - Título del módulo
  - Descripción breve del módulo
  - ${lessonsPerModule} lecciones, cada una con:
    - Título de la lección
    - Tipo: VIDEO, TEXT, QUIZ, o ASSIGNMENT (varía entre tipos, la mayoría VIDEO)
    - Descripción breve (opcional)
    - Duración estimada en minutos (opcional)

Responde SOLO con JSON válido.`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPTS.COURSE_OUTLINE,
    userPrompt,
    schema: courseOutlineSchema,
    maxTokens: 8192,
    temperature: 0.8,
  });
}
