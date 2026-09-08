export { generateText, generateJSON } from "./claude";
export type { GenerateTextOptions } from "./claude";

export {
  submitTranscription,
  getTranscriptionResult,
  transcribeAudio,
} from "./assemblyai";
export type {
  TranscriptionSubmitResult,
  TranscriptionResult,
} from "./assemblyai";

export { SYSTEM_PROMPTS } from "./prompts";
export type { SystemPromptKey } from "./prompts";

// Harness de agente: registro de herramientas, frontera de confianza y
// politica de permisos por paso. Ver src/agent/index.ts.
export * from "./agent";
