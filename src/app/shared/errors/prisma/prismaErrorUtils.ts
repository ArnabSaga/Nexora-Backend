import status from 'http-status';
import { TErrorResponse, TErrorSources } from '../../types/error.types';

export const getStatusCodeFromPrismaError = (errorCode: string): number => {
  if (errorCode === 'P2002') {
    return status.CONFLICT;
  }

  if (['P2001', 'P2025', 'P2015', 'P2018'].includes(errorCode)) {
    return status.NOT_FOUND;
  }

  if (['P1000', 'P6002'].includes(errorCode)) {
    return status.UNAUTHORIZED;
  }

  if (['P1010', 'P6010'].includes(errorCode)) {
    return status.FORBIDDEN;
  }

  if (errorCode === 'P6003') {
    return status.PAYMENT_REQUIRED;
  }

  if (['P1008', 'P2004', 'P6004'].includes(errorCode)) {
    return status.GATEWAY_TIMEOUT;
  }

  if (errorCode === 'P5011') {
    return status.TOO_MANY_REQUESTS;
  }

  if (errorCode === 'P6009') {
    return status.REQUEST_ENTITY_TOO_LARGE;
  }

  if (errorCode.startsWith('P1') || ['P2024', 'P2037', 'P6008'].includes(errorCode)) {
    return status.SERVICE_UNAVAILABLE;
  }

  if (errorCode.startsWith('P2')) {
    return status.BAD_REQUEST;
  }

  if (errorCode.startsWith('P3') || errorCode.startsWith('P4')) {
    return status.INTERNAL_SERVER_ERROR;
  }

  return status.INTERNAL_SERVER_ERROR;
};

export const cleanPrismaMessage = (message: string): string => {
  return message.replace(/Invalid `.*?` invocation:?\s*/i, '').trim();
};

export const getMainMessage = (message: string, fallback: string): string => {
  const lines = cleanPrismaMessage(message)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] || fallback;
};

export const formatErrorMeta = (meta?: Record<string, unknown>): string => {
  if (!meta) return '';

  const parts: string[] = [];

  if (meta.target) {
    const target = Array.isArray(meta.target) ? meta.target.join(', ') : String(meta.target);
    parts.push(`Field(s): ${target}`);
  }

  if (meta.field_name) {
    parts.push(`Field: ${String(meta.field_name)}`);
  }

  if (meta.column_name) {
    parts.push(`Column: ${String(meta.column_name)}`);
  }

  if (meta.model_name) {
    parts.push(`Model: ${String(meta.model_name)}`);
  }

  if (meta.relation_name) {
    parts.push(`Relation: ${String(meta.relation_name)}`);
  }

  if (meta.constraint) {
    parts.push(`Constraint: ${String(meta.constraint)}`);
  }

  return parts.length > 0 ? parts.join(' | ') : '';
};

export const buildPrismaErrorResponse = (
  statusCode: number,
  message: string,
  errorMessages: TErrorSources
): TErrorResponse => ({
  success: false,
  statusCode,
  message,
  errorMessages,
});
