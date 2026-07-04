import { Response } from "express";
import { TResponse } from "./response.types";

export const sendResponse = <T>(res: Response, responseData: TResponse<T>) => {
  const { statusCode, success, message, data, meta } = responseData;

  return res.status(statusCode).json({
    success,
    statusCode,
    message,
    ...(meta && { meta }),
    ...(data !== undefined && { data }),
  });
};
