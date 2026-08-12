import { Router } from "express";
import { notificationMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { NotificationController } from "./notification.controller";
import { NotificationValidation } from "./notification.validation";

const router = Router();
router.get(
  "/",
  requireAuth,
  validateRequest({ query: NotificationValidation.listQuery }),
  NotificationController.getNotifications,
);
router.patch(
  "/read-all",
  requireAuth,
  notificationMutationRateLimit,
  validateRequest({
    body: NotificationValidation.emptyBody,
    query: NotificationValidation.emptyQuery,
  }),
  NotificationController.markAllRead,
);
router.patch(
  "/:id/read",
  requireAuth,
  notificationMutationRateLimit,
  validateRequest({
    params: NotificationValidation.idParam,
    body: NotificationValidation.emptyBody,
    query: NotificationValidation.emptyQuery,
  }),
  NotificationController.markRead,
);
router.delete(
  "/:id",
  requireAuth,
  notificationMutationRateLimit,
  validateRequest({
    params: NotificationValidation.idParam,
    body: NotificationValidation.emptyBody,
    query: NotificationValidation.emptyQuery,
  }),
  NotificationController.deleteNotification,
);
export const NotificationRoutes = router;
