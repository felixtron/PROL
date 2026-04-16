const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

function getApiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not set");
  return key;
}

function assemblyHeaders() {
  return {
    Authorization: getApiKey(),
    "Content-Type": "application/json",
  };
}

export interface TranscriptionSubmitResult {
  id: string;
  status: string;
}

/**
 * Submit an audio/video URL for transcription.
 */
export async function submitTranscription(
  audioUrl: string,
  options?: {
    languageCode?: string;
    speakerLabels?: boolean;
    autoChapters?: boolean;
    summarization?: boolean;
    summaryModel?: string;
    summaryType?: string;
  }
): Promise<TranscriptionSubmitResult> {
  const response = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: "POST",
    headers: assemblyHeaders(),
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: options?.languageCode ?? "es",
      speaker_labels: options?.speakerLabels ?? false,
      auto_chapters: options?.autoChapters ?? false,
      summarization: options?.summarization ?? true,
      summary_model: options?.summaryModel ?? "informative",
      summary_type: options?.summaryType ?? "paragraph",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AssemblyAI submit failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { id: data.id, status: data.status };
}

export interface TranscriptionResult {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  text: string | null;
  words: Array<{ text: string; start: number; end: number; confidence: number }> | null;
  summary: string | null;
  chapters: Array<{ summary: string; headline: string; start: number; end: number }> | null;
  error: string | null;
}

/**
 * Get the result of a previously submitted transcription.
 */
export async function getTranscriptionResult(
  transcriptId: string
): Promise<TranscriptionResult> {
  const response = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
    headers: assemblyHeaders(),
  });

  if (!response.ok) {
    throw new Error(`AssemblyAI get failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    status: data.status,
    text: data.text ?? null,
    words: data.words ?? null,
    summary: data.summary ?? null,
    chapters: data.chapters ?? null,
    error: data.error ?? null,
  };
}

/**
 * Submit and poll until transcription is complete (blocking).
 * Useful for short audio, not recommended for long videos — use jobs instead.
 */
export async function transcribeAudio(
  audioUrl: string,
  options?: Parameters<typeof submitTranscription>[1] & { pollIntervalMs?: number; timeoutMs?: number }
): Promise<TranscriptionResult> {
  const { pollIntervalMs = 5000, timeoutMs = 600000, ...submitOptions } = options ?? {};

  const submitted = await submitTranscription(audioUrl, submitOptions);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await getTranscriptionResult(submitted.id);

    if (result.status === "completed") return result;
    if (result.status === "error") throw new Error(`Transcription failed: ${result.error}`);

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Transcription timed out");
}
