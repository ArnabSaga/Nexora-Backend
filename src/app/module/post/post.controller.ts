import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { FeedService } from "./services/feed.service";
import { PostService } from "./services/post.service";

const getFiles = (files: unknown) => {
  return Array.isArray(files) ? (files as Express.Multer.File[]) : [];
};

const create = catchAsync(async (req, res) => {
  const result = await PostService.create(req.user!, req.body, getFiles(req.files));

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Post created successfully",
    data: result,
  });
});

const getPersonalizedFeed = catchAsync(async (req, res) => {
  const result = await FeedService.getPersonalizedFeed(req.user!, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Feed retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPublicFeed = catchAsync(async (req, res) => {
  const result = await FeedService.getPublicFeed(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Public feed retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMyPosts = catchAsync(async (req, res) => {
  const result = await FeedService.getMyPosts(req.user!, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Posts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getUserPosts = catchAsync(async (req, res) => {
  const result = await FeedService.getUserPosts(
    req.params.userId as string,
    req.query,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User posts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getCommunityPosts = catchAsync(async (req, res) => {
  const result = await FeedService.getCommunityPosts(
    req.params.communityId as string,
    req.query,
    req.user,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community posts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getById = catchAsync(async (req, res) => {
  const result = await PostService.getById(req.params.id as string, req.user);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Post retrieved successfully",
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await PostService.update(
    req.params.id as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Post updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  await PostService.delete(req.params.id as string, req.user!);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Post deleted successfully",
    data: null,
  });
});

const repost = catchAsync(async (req, res) => {
  const result = await PostService.repost(
    req.params.id as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Post reposted successfully",
    data: result,
  });
});

export const PostController = {
  create,
  getPersonalizedFeed,
  getPublicFeed,
  getMyPosts,
  getUserPosts,
  getCommunityPosts,
  getById,
  update,
  delete: remove,
  repost,
};
