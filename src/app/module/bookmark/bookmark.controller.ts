import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { BookmarkService } from "./bookmark.service";

const saveBookmark = catchAsync(async (req, res) => {
  const result = await BookmarkService.saveBookmark(
    req.params.postId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: result.statusCode,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const removeBookmark = catchAsync(async (req, res) => {
  const result = await BookmarkService.removeBookmark(
    req.params.postId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: result.statusCode,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const getBookmarks = catchAsync(async (req, res) => {
  const result = await BookmarkService.getBookmarks(req.user!, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Bookmarks retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const BookmarkController = {
  saveBookmark,
  removeBookmark,
  getBookmarks,
};
