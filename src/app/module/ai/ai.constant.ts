export const AI_REWRITE_ACTION = {
  IMPROVE: "IMPROVE",
  SHORTEN: "SHORTEN",
  EXPAND: "EXPAND",
} as const;

export const AI_TONE = {
  NEUTRAL: "NEUTRAL",
  PROFESSIONAL: "PROFESSIONAL",
  FRIENDLY: "FRIENDLY",
  CONFIDENT: "CONFIDENT",
} as const;

export const AI_PROFILE_FIELD = {
  HEADLINE: "HEADLINE",
  BIO: "BIO",
} as const;

export const AI_DEFAULT_HASHTAG_LIMIT = 5;
export const AI_MAX_HASHTAG_LIMIT = 10;
export const AI_PROVIDER_TIMEOUT_MS = 15_000;
export const AI_MAX_OUTPUT_TOKENS = 2_048;

export const AI_ERROR_MESSAGE = {
  UNAVAILABLE: "AI service is temporarily unavailable",
  BLOCKED: "AI could not generate a safe response",
  INVALID_RESPONSE: "AI provider returned an invalid response",
  CONFIGURATION: "AI service configuration error",
} as const;
