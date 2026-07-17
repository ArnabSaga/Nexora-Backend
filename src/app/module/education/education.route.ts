import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { EducationController } from "./education.controller";
import { EducationValidation } from "./education.validation";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateRequest({ body: EducationValidation.create }),
  EducationController.create,
);

router.get("/", requireAuth, EducationController.getOwn);

router.patch(
  "/:id",
  requireAuth,
  validateRequest({
    params: EducationValidation.idParam,
    body: EducationValidation.update,
  }),
  EducationController.update,
);

router.delete(
  "/:id",
  requireAuth,
  validateRequest({ params: EducationValidation.idParam }),
  EducationController.delete,
);

export const EducationRoutes = router;
