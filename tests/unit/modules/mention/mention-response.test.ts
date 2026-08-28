import assert from "node:assert/strict";
import test from "node:test";
import { mapMentionResponse } from "../../../../src/app/module/mention";

test("Mention response mapping preserves shape and profile fallbacks", () => {
  assert.deepEqual(
    mapMentionResponse({
      id: "cmention",
      mentionedUser: {
        id: "cuser",
        name: "Mentioned User",
        image: "image-fallback",
        profile: null,
      },
    }),
    {
      id: "cmention",
      user: {
        id: "cuser",
        name: "Mentioned User",
        username: "cuser",
        avatar: "image-fallback",
      },
    },
  );

  assert.deepEqual(
    mapMentionResponse({
      id: "cmentionprofile",
      mentionedUser: {
        id: "cprofileuser",
        name: "Profile User",
        image: "image-fallback",
        profile: { username: "profile_name", avatar: "profile-avatar" },
      },
    }).user,
    {
      id: "cprofileuser",
      name: "Profile User",
      username: "profile_name",
      avatar: "profile-avatar",
    },
  );
});
