import { Router } from "express";
import { reactionMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ReactionController } from "./reaction.controller";
import { ReactionValidation } from "./reaction.validation";

const router = Router();

router.post(
  "/:postId/reactions",
  requireAuth,
  reactionMutationRateLimit,
  validateRequest(ReactionValidation.postReaction),
  ReactionController.savePostReaction,
);

router.delete(
  "/:postId/reactions",
  requireAuth,
  reactionMutationRateLimit,
  validateRequest(ReactionValidation.deletePostReaction),
  ReactionController.removePostReaction,
);

export const PostReactionRoutes = router;
