import { generateJSON, SYSTEM_PROMPTS, submitTranscription, getTranscriptionResult } from "@prol/ai";
import { z } from "zod";

const interactiveStopSchema = z.object({
  timestampSeconds: z.number(),
  question: z.string(),
  type: z.enum(["REFLECTION", "MULTIPLE_CHOICE", "TRUE_FALSE"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
});

const quizSuggestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
});

const videoProcessingResultSchema = z.object({
  transcript: z.string(),
  summary: z.string(),
  suggestedStops: z.array(interactiveStopSchema),
  quizSuggestions: z.array(quizSuggestionSchema),
});

export type VideoProcessingResult = z.infer<typeof videoProcessingResultSchema>;
export type InteractiveStop = z.infer<typeof interactiveStopSchema>;
export type QuizSuggestion = z.infer<typeof quizSuggestionSchema>;

export interface ProcessVideoInput {
  videoUrl: string;
  lessonTitle: string;
  courseContext?: string;
}

/**
 * Step 1: Submit video for transcription via AssemblyAI.
 * Returns the transcription job ID for polling.
 */
export async function submitVideoForTranscription(videoUrl: string) {
  return submitTranscription(videoUrl, {
    languageCode: "es",
    speakerLabels: false,
    summarization: true,
    summaryModel: "informative",
    summaryType: "paragraph",
  });
}

/**
 * Step 2: Check transcription status.
 */
export async function checkTranscriptionStatus(transcriptionId: string) {
  return getTranscriptionResult(transcriptionId);
}

/**
 * Step 3: Once transcription is complete, generate AI-enhanced content
 * (interactive stops, quiz suggestions) from the transcript.
 */
export async function enhanceTranscript(
  transcript: string,
  summary: string | null,
  lessonTitle: string,
  courseContext?: string
): Promise<VideoProcessingResult> {
  const contextInfo = courseContext ? `\nCONTEXTO DEL CURSO: ${courseContext}` : "";

  const userPrompt = `Analiza la siguiente transcripción de una lección de video y genera contenido interactivo.

TÍTULO DE LA LECCIÓN: ${lessonTitle}${contextInfo}

TRANSCRIPCIÓN:
${transcript}

${summary ? `RESUMEN EXISTENTE: ${summary}` : ""}

Genera:
1. Un resumen claro y conciso (si no existe ya)
2. 3-5 paradas interactivas en momentos clave de la lección
3. 2-4 preguntas de quiz basadas en el contenido

Responde SOLO con JSON válido.`;

  return generateJSON({
    systemPrompt: SYSTEM_PROMPTS.VIDEO_SUMMARY,
    userPrompt,
    schema: videoProcessingResultSchema,
    maxTokens: 4096,
    temperature: 0.6,
  });
}
