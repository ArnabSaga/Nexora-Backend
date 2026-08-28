import { z } from "zod";

export const aiContentResultSchema = z
  .object({ content: z.string() })
  .strict();

export const aiHashtagResultSchema = z
  .object({ hashtags: z.array(z.string()) })
  .strict();

export const toProviderJsonSchema = (schema: z.ZodType) =>
  z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
