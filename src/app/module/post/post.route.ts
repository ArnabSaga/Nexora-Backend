import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/requireAuth";
import { optionalAuth } from "../../middleware/optionalAuth";
import { postCreateRateLimit } from "../../middleware/rateLimit";
import { validateRequest } from "../../middleware/validateRequest";
import { FILE_UPLOAD } from "../../shared/constants/upload.constant";
import { POST_MEDIA_MAX_FILES } from "./constants/post.constant";
import { PostController } from "./post.controller";
import { PostMediaService } from "./services/post-media.service";
import { PostValidation } from "./post.validation";

const router = Router();

const postMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_UPLOAD.MAX_FILE_SIZE,
    files: POST_MEDIA_MAX_FILES,
  },
});

const validatePostMedia = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    PostMediaService.validateFiles(
      Array.isArray(req.files) ? req.files : [],
    );
    next();
  } catch (error) {
    next(error);
  }
};

router.post(
  "/",
  requireAuth,
  postCreateRateLimit,
  postMediaUpload.array("media", POST_MEDIA_MAX_FILES),
  validatePostMedia,
  validateRequest({ body: PostValidation.create }),
  PostController.create,
);

router.get(
  "/feed",
  requireAuth,
  validateRequest({ query: PostValidation.feedQuery }),
  PostController.getPersonalizedFeed,
);

router.get(
  "/public-feed",
  validateRequest({ query: PostValidation.feedQuery }),
  PostController.getPublicFeed,
);

router.get(
  "/my-posts",
  requireAuth,
  validateRequest({ query: PostValidation.offsetQuery }),
  PostController.getMyPosts,
);

router.get(
  "/user/:userId",
  validateRequest({
    params: PostValidation.userIdParam,
    query: PostValidation.offsetQuery,
  }),
  PostController.getUserPosts,
);

router.get(
  "/community/:communityId",
  optionalAuth,
  validateRequest({
    params: PostValidation.communityIdParam,
    query: PostValidation.offsetQuery,
  }),
  PostController.getCommunityPosts,
);

router.post(
  "/:id/repost",
  requireAuth,
  postCreateRateLimit,
  validateRequest({
    params: PostValidation.idParam,
    body: PostValidation.repost,
  }),
  PostController.repost,
);

router.get(
  "/:id",
  optionalAuth,
  validateRequest({ params: PostValidation.idParam }),
  PostController.getById,
);

router.patch(
  "/:id",
  requireAuth,
  validateRequest({
    params: PostValidation.idParam,
    body: PostValidation.update,
  }),
  PostController.update,
);

router.delete(
  "/:id",
  requireAuth,
  validateRequest({ params: PostValidation.idParam }),
  PostController.delete,
);

export const PostRoutes = router;
