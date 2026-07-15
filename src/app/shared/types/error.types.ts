export type TErrorSource = {
  path: string | number;
  message: string;
};

export type TErrorSources = TErrorSource[];

export type TErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  errorMessages: TErrorSources;
};
