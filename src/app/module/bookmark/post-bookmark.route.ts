import { Router } from "express";
import { bookmarkMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { BookmarkController } from "./bookmark.controller";
import { BookmarkValidation } from "./bookmark.validation";

const router = Router();

router.post(
  "/:postId/bookmarks",
  requireAuth,
  bookmarkMutationRateLimit,
  validateRequest({ params: BookmarkValidation.postIdParam }),
  BookmarkController.saveBookmark,
);

router.delete(
  "/:postId/bookmarks",
  requireAuth,
  bookmarkMutationRateLimit,
  validateRequest({ params: BookmarkValidation.postIdParam }),
  BookmarkController.removeBookmark,
);

export const PostBookmarkRoutes = router;
