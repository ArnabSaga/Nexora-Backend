import { Router } from "express";
import { reactionMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReactionController } from "./reaction.controller";
import { ReactionValidation } from "./reaction.validation";

const router = Router();

router.post(
  "/:commentId/reactions",
  requireAuth,
  reactionMutationRateLimit,
  validateRequest(ReactionValidation.commentReaction),
  ReactionController.saveCommentReaction,
);

router.delete(
  "/:commentId/reactions",
  requireAuth,
  reactionMutationRateLimit,
  validateRequest(ReactionValidation.deleteCommentReaction),
  ReactionController.removeCommentReaction,
);

export const CommentReactionRoutes = router;
