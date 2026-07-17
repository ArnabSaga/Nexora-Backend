import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { SkillController } from "./skill.controller";
import { SkillValidation } from "./skill.validation";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateRequest({ body: SkillValidation.create }),
  SkillController.add,
);

router.get("/", requireAuth, SkillController.getOwn);

router.delete(
  "/:id",
  requireAuth,
  validateRequest({ params: SkillValidation.idParam }),
  SkillController.delete,
);

export const SkillRoutes = router;
