import { AIError, type AIProvider, type GenerateOptions } from "./types";
import { withRetry } from "./retry";

export function geminiFromEnv(): AIProvider {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!key || !model) {
    throw new AIError("AI is not set up yet. Add GEMINI_API_KEY and GEMINI_MODEL to .env.local and restart the server.", false, "ai_not_configured");
  }

  const call = async ({ system, prompt, temperature = 0.3, maxOutputTokens }: GenerateOptions) => {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature, ...(maxOutputTokens ? { maxOutputTokens } : {}) },
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch {
      throw new AIError("Could not reach the AI service. Check your internet connection.", true, "network");
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      const detail = body?.error?.message ?? res.statusText;
      if (res.status === 429) throw new AIError("The AI rate limit was reached. On the free tier this can also mean the daily limit is used up. Try again in a few minutes.", true, "rate_limited");
      if (res.status >= 500) throw new AIError("The AI service is temporarily unavailable.", true, "unavailable");
      if (res.status === 400 && /api key/i.test(detail)) throw new AIError("The Gemini API key is invalid. Check GEMINI_API_KEY in .env.local.", false, "bad_key");
      if (res.status === 403 || res.status === 401) throw new AIError("The Gemini API key was rejected. Check GEMINI_API_KEY in .env.local.", false, "bad_key");
      if (res.status === 404) throw new AIError("The model name in GEMINI_MODEL was not found. Check it in Google AI Studio.", false, "bad_model");
      throw new AIError(`The AI request failed: ${detail}`, false);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) throw new AIError("The AI declined to process part of this document.", false, "blocked");
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) throw new AIError("The AI returned an empty answer.", true, "empty");
    return text;
  };

  return { name: "gemini", generateText: (opts) => withRetry(() => call(opts)) };
}
