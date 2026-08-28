import { aiRateLimit } from "../../middleware/rateLimit";
import { AiController } from "./ai.controller";
import { createAiRoutes } from "./ai.route.factory";

export const AiRoutes = createAiRoutes(AiController, aiRateLimit);
