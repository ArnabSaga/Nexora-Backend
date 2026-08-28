import { envVars } from "../../config/env";
import { createGeminiAiProvider, createGeminiClient } from "./ai-gemini.adapter";
import { createAiService } from "./ai.factory";

export const GeminiAiProvider = createGeminiAiProvider({
  generator: createGeminiClient(envVars.AI.GEMINI_API_KEY).models,
  model: envVars.AI.GEMINI_MODEL,
});

export const AiService = createAiService(GeminiAiProvider);
