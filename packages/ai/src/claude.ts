import Anthropic from "@anthropic-ai/sdk";

// Singleton client
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export interface GenerateTextOptions {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

/**
 * Generate text completion using Claude.
 */
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    model = "claude-sonnet-4-5-20250929",
  } = options;

  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }
  return textBlock.text;
}

/**
 * Generate a JSON response from Claude with Zod schema validation.
 * Uses ZodTypeAny so schemas with `.default()` / `.optional()` (input != output)
 * work correctly; the return type is inferred from the parsed output.
 */
export async function generateJSON<S extends import("zod").ZodTypeAny>(
  options: GenerateTextOptions & { schema: S }
): Promise<import("zod").infer<S>> {
  const { schema, ...textOptions } = options;

  const enhancedPrompt = `${textOptions.userPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`;

  const raw = await generateText({ ...textOptions, userPrompt: enhancedPrompt });

  // Try to extract JSON from response (handle markdown fences)
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);
  return schema.parse(parsed);
}
