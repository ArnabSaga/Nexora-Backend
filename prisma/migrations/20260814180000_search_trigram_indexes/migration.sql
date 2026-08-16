CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "user_name_trgm_idx" ON "user" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "profile_username_trgm_idx" ON "profile" USING GIN ("username" gin_trgm_ops);
CREATE INDEX "profile_headline_trgm_idx" ON "profile" USING GIN ("headline" gin_trgm_ops);
CREATE INDEX "profile_profession_trgm_idx" ON "profile" USING GIN ("profession" gin_trgm_ops);
CREATE INDEX "profile_company_trgm_idx" ON "profile" USING GIN ("company" gin_trgm_ops);
CREATE INDEX "post_content_trgm_idx" ON "post" USING GIN ("content" gin_trgm_ops);
CREATE INDEX "community_name_trgm_idx" ON "community" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "community_slug_trgm_idx" ON "community" USING GIN ("slug" gin_trgm_ops);
CREATE INDEX "community_description_trgm_idx" ON "community" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "hashtag_name_trgm_idx" ON "hashtag" USING GIN ("name" gin_trgm_ops);
