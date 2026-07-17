import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { ExperienceService } from "./experience.service";

const create = catchAsync(async (req, res) => {
  const result = await ExperienceService.create(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Experience added successfully",
    data: result,
  });
});

const getOwn = catchAsync(async (req, res) => {
  const result = await ExperienceService.getOwn(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Experiences retrieved successfully",
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await ExperienceService.update(
    req.user!.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Experience updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  await ExperienceService.delete(req.user!.id, req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Experience deleted successfully",
    data: null,
  });
});

export const ExperienceController = {
  create,
  getOwn,
  update,
  delete: remove,
};
