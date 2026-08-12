import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";

export const rethrowReportCreateError = (
  error: unknown,
  targetField: "reportedUserId" | "postId" | "commentId" | "communityId",
): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    const metadata = JSON.stringify(error.meta ?? {}).toLowerCase();
    if (metadata.includes(targetField.toLowerCase())) {
      throw new AppError(status.NOT_FOUND, "Report target not found");
    }
  }
  throw error;
};
