import { Router, type RequestHandler } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import type { TAiController } from "./ai.controller.factory";
import { AiValidation } from "./ai.validation";

export const createAiRoutes = (
  controller: TAiController,
  limiter: RequestHandler,
) => {
  const router = Router();

  router.post(
    "/posts/improve",
    requireAuth,
    limiter,
    validateRequest({ body: AiValidation.improvePost }),
    controller.improvePost,
  );
  router.post(
    "/posts/generate",
    requireAuth,
    limiter,
    validateRequest({ body: AiValidation.generatePost }),
    controller.generatePost,
  );
  router.post(
    "/posts/hashtags",
    requireAuth,
    limiter,
    validateRequest({ body: AiValidation.generateHashtags }),
    controller.generateHashtags,
  );
  router.post(
    "/comments/improve",
    requireAuth,
    limiter,
    validateRequest({ body: AiValidation.improveComment }),
    controller.improveComment,
  );
  router.post(
    "/profiles/improve",
    requireAuth,
    limiter,
    validateRequest({ body: AiValidation.improveProfile }),
    controller.improveProfile,
  );

  return router;
};
