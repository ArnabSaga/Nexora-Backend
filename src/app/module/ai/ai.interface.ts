import type { z } from "zod";
import type { AI_PROFILE_FIELD, AI_REWRITE_ACTION, AI_TONE } from "./ai.constant";
import type { AiValidation } from "./ai.validation";

export type TAiRewriteAction =
  (typeof AI_REWRITE_ACTION)[keyof typeof AI_REWRITE_ACTION];
export type TAiTone = (typeof AI_TONE)[keyof typeof AI_TONE];
export type TAiProfileField =
  (typeof AI_PROFILE_FIELD)[keyof typeof AI_PROFILE_FIELD];

export type TAiProvider = {
  generateStructured(input: {
    systemInstruction: string;
    userContent: string;
    responseSchema: Record<string, unknown>;
    maxOutputTokens: number;
  }): Promise<unknown>;
};

export type TAiImprovePostInput = z.input<typeof AiValidation.improvePost>;
export type TNormalizedAiImprovePostInput = z.output<
  typeof AiValidation.improvePost
>;
export type TAiGeneratePostInput = z.input<typeof AiValidation.generatePost>;
export type TNormalizedAiGeneratePostInput = z.output<
  typeof AiValidation.generatePost
>;
export type TAiGenerateHashtagsInput = z.input<
  typeof AiValidation.generateHashtags
>;
export type TNormalizedAiGenerateHashtagsInput = z.output<
  typeof AiValidation.generateHashtags
>;
export type TAiImproveCommentInput = z.input<
  typeof AiValidation.improveComment
>;
export type TNormalizedAiImproveCommentInput = z.output<
  typeof AiValidation.improveComment
>;
export type TAiImproveProfileInput = z.input<
  typeof AiValidation.improveProfile
>;
export type TNormalizedAiImproveProfileInput = z.output<
  typeof AiValidation.improveProfile
>;

export type TAiService = {
  improvePost(input: TAiImprovePostInput): Promise<{ content: string }>;
  generatePost(input: TAiGeneratePostInput): Promise<{ content: string }>;
  generateHashtags(
    input: TAiGenerateHashtagsInput,
  ): Promise<{ hashtags: string[] }>;
  improveComment(input: TAiImproveCommentInput): Promise<{ content: string }>;
  improveProfile(input: TAiImproveProfileInput): Promise<{ content: string }>;
};
