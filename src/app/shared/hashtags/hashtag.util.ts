import { HASHTAG_MAX_LENGTH } from "./hashtag.constant";

const HASHTAG_PATTERN = /(^|[^A-Za-z0-9_#])#([A-Za-z0-9_]+)/g;
const HASHTAG_PATH_PATTERN = new RegExp(
  `^[A-Za-z0-9_]{1,${HASHTAG_MAX_LENGTH}}$`,
);

export const extractHashtagNames = (content: string) => {
  const names = new Set<string>();
  let match: RegExpExecArray | null;

  HASHTAG_PATTERN.lastIndex = 0;
  while ((match = HASHTAG_PATTERN.exec(content))) {
    names.add(match[2].toLowerCase().slice(0, HASHTAG_MAX_LENGTH));
  }

  return [...names];
};

export const parseHashtagPathTag = (tag: unknown) => {
  if (typeof tag !== "string" || !HASHTAG_PATH_PATTERN.test(tag)) {
    return null;
  }

  return tag.toLowerCase();
};
