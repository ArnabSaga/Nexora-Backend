import { z } from "zod";

type TScalarPositiveIntegerQueryOptions = {
  min: number;
  max: number;
};

export const scalarPositiveIntegerQuery = ({
  min,
  max,
}: TScalarPositiveIntegerQueryOptions) =>
  z.preprocess((value) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value !== "string") {
      return value;
    }

    if (!/^[1-9]\d*$/.test(value)) {
      return value;
    }

    return Number(value);
  }, z.number().finite().int().refine(Number.isSafeInteger, {
    message: "Expected a safe integer",
  }).min(min).max(max));
