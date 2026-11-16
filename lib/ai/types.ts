export type GenerateOptions = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

/** Every AI provider implements this one method. Add a new file + a case in lib/ai/index.ts to switch providers. */
export interface AIProvider {
  readonly name: string;
  generateText(opts: GenerateOptions): Promise<string>;
}

export class AIError extends Error {
  constructor(message: string, public retryable = false, public code?: string) {
    super(message);
  }
}
