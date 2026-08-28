import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import type { TTrendingPostQuery } from "./trending.interface";
import { TrendingService } from "./trending.service";

const getTrendingPosts = catchAsync(async (req, res) => {
  const result = await TrendingService.getTrendingPosts(
    req.query as unknown as TTrendingPostQuery,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Trending posts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const TrendingController = { getTrendingPosts };
