import {
  ApiError,
  BlockedReason,
  FinishReason,
  GoogleGenAI,
  type GenerateContentResponse,
  type GoogleGenAIOptions,
} from "@google/genai";
import status from "http-status";
import AppError from "../../shared/errors/AppError";
import {
  AI_ERROR_MESSAGE,
  AI_PROVIDER_TIMEOUT_MS,
} from "./ai.constant";
import type { TAiProvider } from "./ai.interface";

type TGeminiGenerator = {
  generateContent(input: {
    model: string;
    contents: string;
    config: Record<string, unknown>;
  }): Promise<GenerateContentResponse>;
};

const promptBlockReasons = new Set<string>([
  BlockedReason.SAFETY,
  BlockedReason.OTHER,
  BlockedReason.BLOCKLIST,
  BlockedReason.PROHIBITED_CONTENT,
  BlockedReason.IMAGE_SAFETY,
  "MODEL_ARMOR",
  "JAILBREAK",
]);

const candidateBlockReasons = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.LANGUAGE,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  "IMAGE_SAFETY",
  "MODEL_ARMOR",
]);

const hasPolicyBlock = (response: GenerateContentResponse) => {
  const promptReason = response.promptFeedback?.blockReason;
  const finishReason = response.candidates?.[0]?.finishReason;
  return Boolean(
    (promptReason && promptBlockReasons.has(promptReason)) ||
      (finishReason && candidateBlockReasons.has(finishReason)),
  );
};

const temporaryStatuses = new Set([408, 429, 500, 502, 503, 504]);
const transportErrorNames = new Set(["AbortError", "TimeoutError"]);
const transportErrorCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);
const MAX_TRANSPORT_ERROR_DEPTH = 8;

export const isVerifiedTransportFailure = (
  error: unknown,
  visited = new Set<object>(),
  depth = 0,
): boolean => {
  if (
    (typeof error !== "object" && typeof error !== "function") ||
    error === null ||
    depth > MAX_TRANSPORT_ERROR_DEPTH ||
    visited.has(error)
  ) {
    return false;
  }

  visited.add(error);

  try {
    const candidate = error as {
      name?: unknown;
      code?: unknown;
      cause?: unknown;
      errors?: unknown;
    };

    if (
      (typeof candidate.name === "string" &&
        transportErrorNames.has(candidate.name)) ||
      (typeof candidate.code === "string" &&
        transportErrorCodes.has(candidate.code))
    ) {
      return true;
    }

    if (
      Array.isArray(candidate.errors) &&
      candidate.errors.some((nested) =>
        isVerifiedTransportFailure(nested, visited, depth + 1),
      )
    ) {
      return true;
    }

    return isVerifiedTransportFailure(candidate.cause, visited, depth + 1);
  } catch {
    return false;
  }
};

const sanitizeGeminiError = (error: unknown): AppError => {
  if (error instanceof ApiError) {
    if (temporaryStatuses.has(error.status)) {
      return new AppError(
        status.SERVICE_UNAVAILABLE,
        AI_ERROR_MESSAGE.UNAVAILABLE,
      );
    }
    return new AppError(
      status.INTERNAL_SERVER_ERROR,
      AI_ERROR_MESSAGE.CONFIGURATION,
    );
  }

  if (isVerifiedTransportFailure(error)) {
    return new AppError(
      status.SERVICE_UNAVAILABLE,
      AI_ERROR_MESSAGE.UNAVAILABLE,
    );
  }

  return new AppError(
    status.INTERNAL_SERVER_ERROR,
    AI_ERROR_MESSAGE.CONFIGURATION,
  );
};

export const createGeminiAiProvider = ({
  generator,
  model,
}: {
  generator: TGeminiGenerator;
  model: string;
}): TAiProvider => ({
  async generateStructured(input) {
    let response: GenerateContentResponse;
    try {
      response = await generator.generateContent({
        model,
        contents: input.userContent,
        config: {
          systemInstruction: input.systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: input.responseSchema,
          maxOutputTokens: input.maxOutputTokens,
        },
      });
    } catch (error) {
      throw sanitizeGeminiError(error);
    }

    if (hasPolicyBlock(response)) {
      throw new AppError(
        status.UNPROCESSABLE_ENTITY,
        AI_ERROR_MESSAGE.BLOCKED,
      );
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === FinishReason.MAX_TOKENS) {
      throw new AppError(status.BAD_GATEWAY, AI_ERROR_MESSAGE.INVALID_RESPONSE);
    }

    const text = response.text;
    if (!text) {
      throw new AppError(status.BAD_GATEWAY, AI_ERROR_MESSAGE.INVALID_RESPONSE);
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AppError(status.BAD_GATEWAY, AI_ERROR_MESSAGE.INVALID_RESPONSE);
    }
  },
});

export const createGeminiClientOptions = (
  apiKey: string,
): GoogleGenAIOptions => ({
    apiKey,
    httpOptions: {
      timeout: AI_PROVIDER_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });

export const createGeminiClient = (apiKey: string) =>
  new GoogleGenAI(createGeminiClientOptions(apiKey));
