import status from "http-status";
import AppError from "../errors/AppError";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtcDateParts = (value: Date) => ({
  year: value.getUTCFullYear(),
  month: value.getUTCMonth() + 1,
  day: value.getUTCDate(),
});

export const isValidDateOnlyString = (value: string) => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const parts = toUtcDateParts(date);

  return parts.year === year && parts.month === month && parts.day === day;
};

export const parseDateOnly = (value: string, fieldName = "date") => {
  if (!isValidDateOnlyString(value)) {
    throw new AppError(
      status.BAD_REQUEST,
      `${fieldName} must be a valid YYYY-MM-DD date`,
    );
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

export const serializeDateOnly = (value?: Date | null) => {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
};

export const compareDateOnly = (left?: Date | null, right?: Date | null) => {
  const leftTime = left?.getTime();
  const rightTime = right?.getTime();

  if (leftTime === undefined && rightTime === undefined) return 0;
  if (leftTime === undefined) return -1;
  if (rightTime === undefined) return 1;

  return leftTime - rightTime;
};

export const getTodayUtcMidnight = () => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

export const assertNotFutureDate = (
  value: Date | null | undefined,
  fieldName: string,
) => {
  if (!value) {
    return;
  }

  if (compareDateOnly(value, getTodayUtcMidnight()) > 0) {
    throw new AppError(
      status.BAD_REQUEST,
      `${fieldName} cannot be in the future`,
    );
  }
};

export const assertDateRange = (
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
) => {
  if (startDate && endDate && compareDateOnly(endDate, startDate) < 0) {
    throw new AppError(
      status.BAD_REQUEST,
      "endDate cannot be earlier than startDate",
    );
  }
};
