import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { SkillService } from "./skill.service";

const add = catchAsync(async (req, res) => {
  const result = await SkillService.add(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Skill added successfully",
    data: result,
  });
});

const getOwn = catchAsync(async (req, res) => {
  const result = await SkillService.getOwn(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Skills retrieved successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  const result = await SkillService.delete(req.user!.id, req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: {
      removed: result.removed,
    },
  });
});

export const SkillController = {
  add,
  getOwn,
  delete: remove,
};
