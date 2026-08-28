import { PostType } from "../../../generated/prisma/client";
import { z } from "zod";
import {
  AI_DEFAULT_HASHTAG_LIMIT,
  AI_MAX_HASHTAG_LIMIT,
  AI_PROFILE_FIELD,
  AI_REWRITE_ACTION,
  AI_TONE,
} from "./ai.constant";

const action = z.enum(AI_REWRITE_ACTION).default(AI_REWRITE_ACTION.IMPROVE);
const tone = z.enum(AI_TONE).default(AI_TONE.NEUTRAL);
const content = (max: number) => z.string().trim().min(1).max(max);

const improvePost = z
  .object({ content: content(5000), action, tone })
  .strict();

const improveComment = z
  .object({ content: content(1000), action, tone })
  .strict();

const improveProfile = z
  .discriminatedUnion("field", [
    z
      .object({
        field: z.literal(AI_PROFILE_FIELD.HEADLINE),
        content: content(160),
        action,
        tone,
      })
      .strict(),
    z
      .object({
        field: z.literal(AI_PROFILE_FIELD.BIO),
        content: content(500),
        action,
        tone,
      })
      .strict(),
  ]);

const generatePost = z
  .object({
    topic: content(500).refine((value) => value.length >= 2, {
      message: "Topic must contain at least 2 characters",
    }),
    keyPoints: z
      .array(content(200))
      .min(1)
      .max(10)
      .superRefine((values, ctx) => {
        const seen = new Set<string>();
        values.forEach((value, index) => {
          const key = value.toLocaleLowerCase();
          if (seen.has(key)) {
            ctx.addIssue({
              code: "custom",
              path: [index],
              message: "Key points must be unique",
            });
          }
          seen.add(key);
        });
      })
      .optional(),
    postType: z
      .enum([PostType.PROFESSIONAL, PostType.SHORT, PostType.DISCUSSION])
      .default(PostType.SHORT),
    tone,
  })
  .strict();

const generateHashtags = z
  .object({
    content: content(5000),
    limit: z
      .number()
      .int()
      .min(1)
      .max(AI_MAX_HASHTAG_LIMIT)
      .default(AI_DEFAULT_HASHTAG_LIMIT),
  })
  .strict();

export const AiValidation = {
  improvePost,
  generatePost,
  generateHashtags,
  improveComment,
  improveProfile,
};
