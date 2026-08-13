import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { HashtagService } from "./hashtag.service";

const getTrending = catchAsync(async (req, res) => {
  const data = await HashtagService.getTrending(req.query);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Trending hashtags retrieved successfully",
    data,
  });
});

const getPostsByHashtag = catchAsync(async (req, res) => {
  const result = await HashtagService.getPostsByHashtag(
    req.params.tag,
    req.query,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Hashtag posts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const HashtagController = { getTrending, getPostsByHashtag };
