import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { BookmarkController } from "./bookmark.controller";
import { BookmarkValidation } from "./bookmark.validation";

const router = Router();

router.get(
  "/",
  requireAuth,
  validateRequest({ query: BookmarkValidation.listQuery }),
  BookmarkController.getBookmarks,
);

export const BookmarkRoutes = router;
