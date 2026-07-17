export const RESERVED_USERNAMES = [
  "me",
  "login",
  "logout",
  "register",
  "verify",
  "forgot-password",
  "reset-password",
  "notifications",
  "search",
  "settings",
  "feed",
  "community",
  "communities",
  "post",
  "posts",
  "profile",
  "profiles",
  "user",
  "users",
  "account",
  "about",
  "privacy",
  "terms",
  "moderator",
  "super-admin",
  "admin",
  "api",
  "system",
  "null",
  "undefined",
  "support",
  "help",
  "explore",
  "favicon",
  "robots",
  "sitemap",
] as const;

export const USERNAME_PATTERN =
  /^(?=.{3,30}$)[a-z0-9](?!.*[._-]{2})[a-z0-9._-]*[a-z0-9]$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isReservedUsername = (value: string) => {
  return RESERVED_USERNAMES.includes(
    normalizeUsername(value) as (typeof RESERVED_USERNAMES)[number],
  );
};

const createUsernameSeed = (value: string) => {
  const seed = normalizeUsername(value)
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/[._-]{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");

  return seed.length >= 3 ? seed : "nexora";
};

export const createProfileUsernameCandidate = (
  user: { id: string; email: string; name: string },
  attempt = 1,
) => {
  const rawSeed = user.email.split("@")[0] || user.name || "nexora";
  const suffix = user.id.slice(0, 8).toLowerCase();
  const attemptSuffix = attempt > 1 ? `_${attempt}` : "";
  const maxSeedLength = 30 - suffix.length - 1 - attemptSuffix.length;
  const trimmedSeed = createUsernameSeed(rawSeed)
    .slice(0, maxSeedLength)
    .replace(/[._-]+$/g, "");
  const seed = trimmedSeed.length >= 3 ? trimmedSeed : "nexora";

  return `${seed}_${suffix}${attemptSuffix}`;
};
