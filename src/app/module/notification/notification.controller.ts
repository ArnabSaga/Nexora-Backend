import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { NotificationService } from "./notification.service";

const getNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getNotifications(
    req.user!,
    req.query,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});
const markRead = catchAsync(async (req, res) => {
  const data = await NotificationService.markRead(
    req.params.id as string,
    req.user!,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification marked as read",
    data,
  });
});
const markAllRead = catchAsync(async (req, res) => {
  const data = await NotificationService.markAllRead(req.user!);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications marked as read",
    data,
  });
});
const deleteNotification = catchAsync(async (req, res) => {
  await NotificationService.deleteNotification(
    req.params.id as string,
    req.user!,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification deleted successfully",
    data: null,
  });
});
export const NotificationController = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
};
