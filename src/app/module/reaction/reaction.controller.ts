import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { ReactionService } from "./reaction.service";

const savePostReaction = catchAsync(async (req, res) => {
  const result = await ReactionService.savePostReaction(
    req.params.postId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Reaction saved successfully",
    data: result,
  });
});

const removePostReaction = catchAsync(async (req, res) => {
  await ReactionService.removePostReaction(
    req.params.postId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Reaction removed successfully",
    data: null,
  });
});

const saveCommentReaction = catchAsync(async (req, res) => {
  const result = await ReactionService.saveCommentReaction(
    req.params.commentId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Reaction saved successfully",
    data: result,
  });
});

const removeCommentReaction = catchAsync(async (req, res) => {
  await ReactionService.removeCommentReaction(
    req.params.commentId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Reaction removed successfully",
    data: null,
  });
});

export const ReactionController = {
  savePostReaction,
  removePostReaction,
  saveCommentReaction,
  removeCommentReaction,
};
