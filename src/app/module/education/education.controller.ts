import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { EducationService } from "./education.service";

const create = catchAsync(async (req, res) => {
  const result = await EducationService.create(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Education added successfully",
    data: result,
  });
});

const getOwn = catchAsync(async (req, res) => {
  const result = await EducationService.getOwn(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Education retrieved successfully",
    data: result,
  });
});

const update = catchAsync(async (req, res) => {
  const result = await EducationService.update(
    req.user!.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Education updated successfully",
    data: result,
  });
});

const remove = catchAsync(async (req, res) => {
  await EducationService.delete(req.user!.id, req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Education deleted successfully",
    data: null,
  });
});

export const EducationController = {
  create,
  getOwn,
  update,
  delete: remove,
};
