import { createAiController } from "./ai.controller.factory";
import { AiService } from "./ai.service";

export const AiController = createAiController(AiService);
