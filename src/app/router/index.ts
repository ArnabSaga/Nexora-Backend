import { Router } from "express";

import { AuthRoutes } from "../module/auth/auth.route";
import { EducationRoutes } from "../module/education/education.route";
import { ExperienceRoutes } from "../module/experience/experience.route";
import { ProfileIdentityRoutes } from "../module/profile/profile.route";
import { SkillRoutes } from "../module/skill/skill.route";
import { UserRoutes } from "../module/user/user.route";

const router = Router();

const moduleRoutes: { path: string; route: Router }[] = [
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/profiles", route: ProfileIdentityRoutes },
  { path: "/profile/experience", route: ExperienceRoutes },
  { path: "/profile/education", route: EducationRoutes },
  { path: "/profile/skills", route: SkillRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
