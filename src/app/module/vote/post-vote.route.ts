import { Router } from "express";
import { voteMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { VoteController } from "./vote.controller";
import { VoteValidation } from "./vote.validation";

const router = Router();

router.post(
  "/:postId/votes",
  requireAuth,
  voteMutationRateLimit,
  validateRequest(VoteValidation.postVote),
  VoteController.savePostVote,
);

router.delete(
  "/:postId/votes",
  requireAuth,
  voteMutationRateLimit,
  validateRequest(VoteValidation.deletePostVote),
  VoteController.removePostVote,
);

export const PostVoteRoutes = router;
