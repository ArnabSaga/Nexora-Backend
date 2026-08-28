import status from "http-status";
import { z } from "zod";
import { HASHTAG_MAX_LENGTH } from "../../shared/hashtags/hashtag.constant";
import AppError from "../../shared/errors/AppError";
import {
  AI_ERROR_MESSAGE,
  AI_MAX_OUTPUT_TOKENS,
} from "./ai.constant";
import type { TAiProvider, TAiService } from "./ai.interface";
import {
  aiContentResultSchema,
  aiHashtagResultSchema,
  toProviderJsonSchema,
} from "./ai.output";
import { AiPrompt } from "./ai.prompt";
import { AiValidation } from "./ai.validation";

const invalidProviderResponse = () =>
  new AppError(status.BAD_GATEWAY, AI_ERROR_MESSAGE.INVALID_RESPONSE);

const parseProviderResult = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw invalidProviderResponse();
  return result.data;
};

const normalizeContent = (value: string, max: number) => {
  const content = value.trim();
  if (!content || content.length > max) throw invalidProviderResponse();
  return { content };
};

const hashtagPattern = new RegExp(
  `^[A-Za-z0-9_]{1,${HASHTAG_MAX_LENGTH}}$`,
);

const normalizeHashtags = (values: string[], limit: number) => {
  const hashtags: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of values) {
    const trimmed = rawValue.trim();
    const normalized = (trimmed.startsWith("#") ? trimmed.slice(1) : trimmed)
      .toLowerCase();
    if (!hashtagPattern.test(normalized)) throw invalidProviderResponse();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      hashtags.push(normalized);
    }
  }

  if (!hashtags.length || hashtags.length > limit) throw invalidProviderResponse();
  return { hashtags };
};

export const createAiService = (provider: TAiProvider): TAiService => {
  const generateContent = async (
    prompt: { systemInstruction: string; userContent: string },
    max: number,
  ) => {
    const value = await provider.generateStructured({
      ...prompt,
      responseSchema: toProviderJsonSchema(aiContentResultSchema),
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
    });
    return normalizeContent(
      parseProviderResult(aiContentResultSchema, value).content,
      max,
    );
  };

  return {
    improvePost: async (rawInput) => {
      const input = AiValidation.improvePost.parse(rawInput);
      return generateContent(AiPrompt.improvePost(input), 5000);
    },
    generatePost: async (rawInput) => {
      const input = AiValidation.generatePost.parse(rawInput);
      return generateContent(AiPrompt.generatePost(input), 5000);
    },
    generateHashtags: async (rawInput) => {
      const input = AiValidation.generateHashtags.parse(rawInput);
      const value = await provider.generateStructured({
        ...AiPrompt.generateHashtags(input),
        responseSchema: toProviderJsonSchema(aiHashtagResultSchema),
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      });
      return normalizeHashtags(
        parseProviderResult(aiHashtagResultSchema, value).hashtags,
        input.limit,
      );
    },
    improveComment: async (rawInput) => {
      const input = AiValidation.improveComment.parse(rawInput);
      return generateContent(AiPrompt.improveComment(input), 1000);
    },
    improveProfile: async (rawInput) => {
      const input = AiValidation.improveProfile.parse(rawInput);
      return generateContent(
        AiPrompt.improveProfile(input),
        input.field === "HEADLINE" ? 160 : 500,
      );
    },
  };
};
