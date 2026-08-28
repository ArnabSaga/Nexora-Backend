import type { RequestHandler } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import type {
  TAiGenerateHashtagsInput,
  TAiGeneratePostInput,
  TAiImproveCommentInput,
  TAiImprovePostInput,
  TAiImproveProfileInput,
  TAiService,
} from "./ai.interface";

export type TAiController = {
  improvePost: RequestHandler;
  generatePost: RequestHandler;
  generateHashtags: RequestHandler;
  improveComment: RequestHandler;
  improveProfile: RequestHandler;
};

const createHandler = <T>(
  operation: (input: T) => Promise<unknown>,
  message: string,
): RequestHandler =>
  catchAsync(async (req, res) => {
    const data = await operation(req.body as T);
    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message,
      data,
    });
  });

export const createAiController = (service: TAiService): TAiController => ({
  improvePost: createHandler<TAiImprovePostInput>(
    service.improvePost,
    "Post content improved successfully",
  ),
  generatePost: createHandler<TAiGeneratePostInput>(
    service.generatePost,
    "Post content generated successfully",
  ),
  generateHashtags: createHandler<TAiGenerateHashtagsInput>(
    service.generateHashtags,
    "Post hashtags generated successfully",
  ),
  improveComment: createHandler<TAiImproveCommentInput>(
    service.improveComment,
    "Comment content improved successfully",
  ),
  improveProfile: createHandler<TAiImproveProfileInput>(
    service.improveProfile,
    "Profile content improved successfully",
  ),
});
