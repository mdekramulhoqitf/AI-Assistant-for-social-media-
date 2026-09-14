// Thin server-only wrapper around the OpenAI Responses API.
// The API key is read from the OPENAI_API_KEY environment secret and is never
// exposed to the browser, persisted, or logged.

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export class OpenAiError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenAiError";
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

export function getOpenAiKey(): string | null {
  const key = process.env["OPENAI_API_KEY"];
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function isOpenAiConfigured(): boolean {
  return getOpenAiKey() !== null;
}

export type ResponsesInputItem = {
  role: "system" | "user" | "assistant" | "developer";
  content: string;
};

export type ResponsesResult = {
  text: string;
  model: string;
  tokensInput: number | null;
  tokensOutput: number | null;
};

type ResponsesPayload = {
  model: string;
  input: ResponsesInputItem[];
  temperature?: number;
  max_output_tokens?: number;
  text?: Record<string, unknown>;
};

function extractText(json: Record<string, unknown>): string {
  if (typeof json["output_text"] === "string") return json["output_text"] as string;
  const output = json["output"];
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output as Array<Record<string, unknown>>) {
    const content = item?.["content"];
    if (!Array.isArray(content)) continue;
    for (const part of content as Array<Record<string, unknown>>) {
      if (typeof part?.["text"] === "string") chunks.push(part["text"] as string);
    }
  }
  return chunks.join("\n").trim();
}

/**
 * Calls the OpenAI Responses API with bounded retries for transient failures.
 * Throws OpenAiError on terminal failures so callers can use a safe fallback.
 */
export async function callResponses(
  payload: ResponsesPayload,
  options: { retries?: number; signal?: AbortSignal } = {},
): Promise<ResponsesResult> {
  const key = getOpenAiKey();
  if (!key) throw new OpenAiError("OpenAI is not connected. Add OPENAI_API_KEY in secrets.", 401);

  const maxAttempts = Math.max(1, (options.retries ?? 2) + 1);
  let lastError: OpenAiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
        signal: options.signal ?? null,
      });
    } catch (err) {
      lastError = new OpenAiError(
        `Network error calling OpenAI: ${(err as Error).message}`,
        503,
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      throw lastError;
    }

    if (res.ok) {
      const json = (await res.json()) as Record<string, unknown>;
      const usage = (json["usage"] ?? {}) as Record<string, number>;
      return {
        text: extractText(json),
        model: typeof json["model"] === "string" ? (json["model"] as string) : payload.model,
        tokensInput: usage["input_tokens"] ?? null,
        tokensOutput: usage["output_tokens"] ?? null,
      };
    }

    const bodyText = await res.text().catch(() => "");
    let message = `OpenAI request failed (${res.status})`;
    try {
      const parsed = JSON.parse(bodyText) as { error?: { message?: string } };
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      if (bodyText) message = bodyText.slice(0, 300);
    }
    lastError = new OpenAiError(message, res.status);

    if (lastError.retryable && attempt < maxAttempts) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * attempt;
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 4000)));
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new OpenAiError("OpenAI request failed", 500);
}
