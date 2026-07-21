import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { CommentService } from "./comment.service";

const createComment = catchAsync(async (req, res) => {
  const result = await CommentService.createComment(
    req.params.postId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Comment created successfully",
    data: result,
  });
});

const createReply = catchAsync(async (req, res) => {
  const result = await CommentService.createReply(
    req.params.commentId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Reply created successfully",
    data: result,
  });
});

const getPostComments = catchAsync(async (req, res) => {
  const result = await CommentService.getPostComments(
    req.params.postId as string,
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Comments retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateComment = catchAsync(async (req, res) => {
  const result = await CommentService.updateComment(
    req.params.id as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Comment updated successfully",
    data: result,
  });
});

const deleteComment = catchAsync(async (req, res) => {
  await CommentService.deleteComment(req.params.id as string, req.user!);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Comment deleted successfully",
    data: null,
  });
});

export const CommentController = {
  createComment,
  createReply,
  getPostComments,
  updateComment,
  deleteComment,
};
