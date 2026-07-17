-- Add a nullable normalized name first so existing data can be cleaned safely.
ALTER TABLE "skill" ADD COLUMN "normalizedName" TEXT;

-- Runtime-equivalent normalization: trim, collapse internal whitespace, lowercase.
UPDATE "skill"
SET "normalizedName" = lower(regexp_replace(trim("name"), '\s+', ' ', 'g'))
WHERE "normalizedName" IS NULL;

-- Choose one canonical skill per normalized name deterministically:
-- oldest createdAt, then lexically lowest id.
CREATE TEMP TABLE "_skill_canonical" AS
SELECT DISTINCT ON ("normalizedName")
  "normalizedName",
  "id" AS "canonicalId"
FROM "skill"
ORDER BY "normalizedName", "createdAt" ASC, "id" ASC;

CREATE TEMP TABLE "_skill_to_canonical" AS
SELECT
  s."id" AS "skillId",
  c."canonicalId"
FROM "skill" s
JOIN "_skill_canonical" c
  ON c."normalizedName" = s."normalizedName";

-- Keep only one UserSkill per user/canonical skill pair before repointing,
-- otherwise @@unique([userId, skillId]) can be violated.
CREATE TEMP TABLE "_user_skill_keep" AS
SELECT DISTINCT ON (us."userId", sc."canonicalId")
  us."id" AS "keepId"
FROM "user_skill" us
JOIN "_skill_to_canonical" sc
  ON sc."skillId" = us."skillId"
ORDER BY us."userId", sc."canonicalId", us."createdAt" ASC, us."id" ASC;

DELETE FROM "user_skill" us
USING "_skill_to_canonical" sc
WHERE sc."skillId" = us."skillId"
  AND us."id" NOT IN (SELECT "keepId" FROM "_user_skill_keep");

UPDATE "user_skill" us
SET "skillId" = sc."canonicalId"
FROM "_skill_to_canonical" sc
WHERE us."skillId" = sc."skillId"
  AND us."skillId" <> sc."canonicalId";

DELETE FROM "skill" s
USING "_skill_to_canonical" sc
WHERE s."id" = sc."skillId"
  AND sc."skillId" <> sc."canonicalId";

ALTER TABLE "skill" ALTER COLUMN "normalizedName" SET NOT NULL;

CREATE UNIQUE INDEX "skill_normalizedName_key" ON "skill"("normalizedName");
