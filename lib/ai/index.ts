import "server-only";
import { AppError } from "@/lib/errors";
import { geminiFromEnv } from "./gemini";
import { AIError, type AIProvider } from "./types";

/** The only place that knows which provider is active. Set AI_PROVIDER in .env.local (default: gemini). */
export function getAI(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  try {
    switch (provider) {
      case "gemini":
        return geminiFromEnv();
      default:
        throw new AIError(`Unknown AI_PROVIDER "${provider}".`, false, "ai_not_configured");
    }
  } catch (e) {
    if (e instanceof AIError && e.code === "ai_not_configured") throw new AppError(e.message, 503, "ai_not_configured");
    throw e;
  }
}
