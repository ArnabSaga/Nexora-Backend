import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { TrendingController } from "./trending.controller";
import { TrendingValidation } from "./trending.validation";

const router = Router();

router.get(
  "/posts",
  optionalAuth,
  validateRequest({ query: TrendingValidation.postQuery }),
  TrendingController.getTrendingPosts,
);

export const TrendingRoutes = router;
