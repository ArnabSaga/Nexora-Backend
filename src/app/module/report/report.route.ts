import { Router } from "express";
import { reportCreateRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { validateRole } from "../../middleware/validateRole";
import { UserRole } from "../../../generated/prisma/client";
import { ReportController } from "./report.controller";
import { ReportValidation } from "./report.validation";

const router = Router();

router.post(
  "/",
  requireAuth,
  reportCreateRateLimit,
  validateRequest({ body: ReportValidation.create }),
  ReportController.createReport,
);

router.get(
  "/",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ query: ReportValidation.list }),
  ReportController.getReports,
);

router.patch(
  "/:id/status",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({
    params: ReportValidation.idParam,
    body: ReportValidation.updateStatus,
  }),
  ReportController.updateReportStatus,
);

router.get(
  "/:id",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: ReportValidation.idParam }),
  ReportController.getReportById,
);

export const ReportRoutes = router;
