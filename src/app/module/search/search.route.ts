import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SearchController } from "./search.controller";
import { SearchValidation } from "./search.validation";

const router = Router();

router.get(
  "/users",
  optionalAuth,
  validateRequest({ query: SearchValidation.dedicatedQuery }),
  SearchController.searchUsers,
);
router.get(
  "/posts",
  optionalAuth,
  validateRequest({ query: SearchValidation.dedicatedQuery }),
  SearchController.searchPosts,
);
router.get(
  "/communities",
  optionalAuth,
  validateRequest({ query: SearchValidation.dedicatedQuery }),
  SearchController.searchCommunities,
);
router.get(
  "/",
  optionalAuth,
  validateRequest({ query: SearchValidation.globalQuery }),
  SearchController.search,
);

export const SearchRoutes = router;
