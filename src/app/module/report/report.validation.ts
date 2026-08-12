import { z } from "zod";
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../../../generated/prisma/client";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import { REPORT_MAX_DETAILS_LENGTH, REPORT_MAX_LIMIT } from "./report.constant";

const details = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  z.string().trim().max(REPORT_MAX_DETAILS_LENGTH).nullable().optional(),
);
const create = z
  .object({
    target: z.object({ type: z.enum(ReportTargetType), id: z.cuid() }).strict(),
    reason: z.enum(ReportReason),
    details,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.reason === ReportReason.OTHER && !value.details) {
      context.addIssue({
        code: "custom",
        path: ["details"],
        message: "Details are required for OTHER reports",
      });
    }
  });
const list = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: REPORT_MAX_LIMIT,
    }).optional(),
    status: z.enum(ReportStatus).optional(),
    targetType: z.enum(ReportTargetType).optional(),
    reason: z.enum(ReportReason).optional(),
  })
  .strict();
const idParam = z.object({ id: z.cuid() }).strict();
const updateStatus = z
  .object({
    status: z.enum(ReportStatus),
  })
  .strict();

export const ReportValidation = { create, list, idParam, updateStatus };
