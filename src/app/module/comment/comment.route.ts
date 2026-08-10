import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { commentCreateRateLimit } from "../../middleware/rateLimit";
import { validateRequest } from "../../middleware/validateRequest";
import { CommentController } from "./comment.controller";
import { CommentValidation } from "./comment.validation";

const router = Router();

router.post(
  "/:commentId/replies",
  requireAuth,
  commentCreateRateLimit,
  validateRequest({
    params: CommentValidation.commentIdParam,
    body: CommentValidation.body,
  }),
  CommentController.createReply,
);

router.patch(
  "/:id",
  requireAuth,
  validateRequest({
    params: CommentValidation.idParam,
    body: CommentValidation.body,
  }),
  CommentController.updateComment,
);

router.delete(
  "/:id",
  requireAuth,
  validateRequest({
    params: CommentValidation.idParam,
  }),
  CommentController.deleteComment,
);

export const CommentRoutes = router;
