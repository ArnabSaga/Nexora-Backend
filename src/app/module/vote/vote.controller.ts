import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { VoteService } from "./vote.service";

const savePostVote = catchAsync(async (req, res) => {
  const result = await VoteService.savePostVote(
    req.params.postId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Vote saved successfully",
    data: result,
  });
});

const removePostVote = catchAsync(async (req, res) => {
  await VoteService.removePostVote(req.params.postId as string, req.user!);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Vote removed successfully",
    data: null,
  });
});

const saveCommentVote = catchAsync(async (req, res) => {
  const result = await VoteService.saveCommentVote(
    req.params.commentId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Vote saved successfully",
    data: result,
  });
});

const removeCommentVote = catchAsync(async (req, res) => {
  await VoteService.removeCommentVote(
    req.params.commentId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Vote removed successfully",
    data: null,
  });
});

export const VoteController = {
  savePostVote,
  removePostVote,
  saveCommentVote,
  removeCommentVote,
};
