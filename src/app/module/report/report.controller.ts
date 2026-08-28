import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { ReportService } from "./report.service";

const createReport = catchAsync(async (req, res) => {
  const result = await ReportService.createReport(req.user!, req.body);
  sendResponse(res, {
    statusCode: result.statusCode,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const getReports = catchAsync(async (req, res) => {
  const result = await ReportService.getReports(req.user!, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Reports retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getReportById = catchAsync(async (req, res) => {
  const data = await ReportService.getReportById(
    req.user!,
    req.params.id as string,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Report retrieved successfully",
    data,
  });
});

const updateReportStatus = catchAsync(async (req, res) => {
  const data = await ReportService.updateReportStatus(
    req.user!,
    req.params.id as string,
    req.body.status,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Report status updated successfully",
    data,
  });
});

export const ReportController = {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
};
