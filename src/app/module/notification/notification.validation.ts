import { z } from "zod";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import { NOTIFICATION_MAX_LIMIT } from "./notification.constant";

const idParam = z
  .object({ id: z.cuid({ error: "Invalid notification id" }) })
  .strict();
const booleanQuery = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());
const listQuery = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: NOTIFICATION_MAX_LIMIT,
    }).optional(),
    isRead: booleanQuery.optional(),
  })
  .strict();
const emptyBody = z.preprocess(
  (value) => (value === undefined ? {} : value),
  z.object({}).strict(),
);
const emptyQuery = z.object({}).strict();

export const NotificationValidation = {
  idParam,
  listQuery,
  emptyBody,
  emptyQuery,
};
