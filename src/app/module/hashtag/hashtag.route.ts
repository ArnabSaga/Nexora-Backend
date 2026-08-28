import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { HashtagController } from "./hashtag.controller";
import { HashtagValidation } from "./hashtag.validation";

const router = Router();

router.get(
  "/trending",
  validateRequest({ query: HashtagValidation.trendingQuery }),
  HashtagController.getTrending,
);

router.get(
  "/:tag/posts",
  validateRequest({
    params: HashtagValidation.tagParam,
    query: HashtagValidation.postListQuery,
  }),
  HashtagController.getPostsByHashtag,
);

export const HashtagRoutes = router;
