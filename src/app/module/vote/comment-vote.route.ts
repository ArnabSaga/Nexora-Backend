import { Router } from "express";
import { voteMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { VoteController } from "./vote.controller";
import { VoteValidation } from "./vote.validation";

const router = Router();

router.post(
  "/:commentId/votes",
  requireAuth,
  voteMutationRateLimit,
  validateRequest(VoteValidation.commentVote),
  VoteController.saveCommentVote,
);

router.delete(
  "/:commentId/votes",
  requireAuth,
  voteMutationRateLimit,
  validateRequest(VoteValidation.deleteCommentVote),
  VoteController.removeCommentVote,
);

export const CommentVoteRoutes = router;
