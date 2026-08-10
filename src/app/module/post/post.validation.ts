import { z } from "zod";
import { PostType, PostVisibility } from "../../../generated/prisma/client";
import {
  POST_CONTENT_MAX_LENGTH,
  POST_MAX_LIMIT,
} from "./constants/post.constant";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";

const cuidSchema = z.string().trim().regex(/^c[a-z0-9]+$/i, "Invalid id");

const contentSchema = z
  .string()
  .max(POST_CONTENT_MAX_LENGTH)
  .transform((value) => value.trim())
  .optional();

const idParam = z.object({
  id: cuidSchema,
});

const userIdParam = z.object({
  userId: cuidSchema,
});

const communityIdParam = z.object({
  communityId: cuidSchema,
});

const mentionedUserIdsSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed) as unknown;
      } catch {
        return value;
      }
    }

    return trimmed.split(",").map((item) => item.trim());
  }

  return value;
}, z.array(cuidSchema).max(50).optional());

const create = z
  .object({
    content: contentSchema,
    postType: z
      .enum([PostType.PROFESSIONAL, PostType.SHORT, PostType.DISCUSSION])
      .optional(),
    visibility: z.nativeEnum(PostVisibility).optional(),
    communityId: cuidSchema.optional(),
    mentionedUserIds: mentionedUserIdsSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.visibility === PostVisibility.COMMUNITY_ONLY &&
      !value.communityId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["communityId"],
        message:
          "COMMUNITY_ONLY visibility is valid only for posts that already belong to a community",
      });
    }
  });

const update = z
  .object({
    content: contentSchema,
    visibility: z.nativeEnum(PostVisibility).optional(),
  })
  .strict()
  .refine((value) => value.content !== undefined || value.visibility !== undefined, {
    message: "At least one field is required",
  });

const repost = z
  .object({
    content: contentSchema,
    visibility: z
      .enum([
        PostVisibility.PUBLIC,
        PostVisibility.FOLLOWERS,
        PostVisibility.PRIVATE,
      ])
      .optional(),
  })
  .strict();

const offsetQuery = z
  .object({
    page: scalarPositiveIntegerQuery({
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
    }).optional(),
    limit: scalarPositiveIntegerQuery({ min: 1, max: POST_MAX_LIMIT }).optional(),
  })
  .strict();

const feedQuery = z
  .object({
    cursor: z.string().trim().min(1).optional(),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: POST_MAX_LIMIT,
    }).optional(),
  })
  .strict();

export const PostValidation = {
  idParam,
  userIdParam,
  communityIdParam,
  create,
  update,
  repost,
  offsetQuery,
  feedQuery,
};
