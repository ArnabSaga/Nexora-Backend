import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { ExperienceController } from "./experience.controller";
import { ExperienceValidation } from "./experience.validation";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateRequest({ body: ExperienceValidation.create }),
  ExperienceController.create,
);

router.get("/", requireAuth, ExperienceController.getOwn);

router.patch(
  "/:id",
  requireAuth,
  validateRequest({
    params: ExperienceValidation.idParam,
    body: ExperienceValidation.update,
  }),
  ExperienceController.update,
);

router.delete(
  "/:id",
  requireAuth,
  validateRequest({ params: ExperienceValidation.idParam }),
  ExperienceController.delete,
);

export const ExperienceRoutes = router;
