import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { requireAuth } from "../../middleware/requireAuth";
import { commentCreateRateLimit } from "../../middleware/rateLimit";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comment.controller";
import { CommentValidation } from "./comment.validation";

const router = Router();

router.post(
  "/:postId/comments",
  requireAuth,
  commentCreateRateLimit,
  validateRequest({
    params: CommentValidation.postIdParam,
    body: CommentValidation.body,
  }),
  CommentController.createComment,
);

router.get(
  "/:postId/comments",
  optionalAuth,
  validateRequest({
    params: CommentValidation.postIdParam,
    query: CommentValidation.listQuery,
  }),
  CommentController.getPostComments,
);

export const PostCommentRoutes = router;
