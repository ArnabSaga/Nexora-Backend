import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMUNITY_RULE_MAX_DESCRIPTION_LENGTH,
  COMMUNITY_RULE_MAX_ORDER,
  COMMUNITY_RULE_MAX_TITLE_LENGTH,
} from "../../../../src/app/module/community-rule/community-rule.constant";
import { CommunityRuleValidation } from "../../../../src/app/module/community-rule/community-rule.validation";

const validCuid = "ck1234567890123456789012";

test("Community Rule validation accepts canonical create and update payloads", () => {
  assert.deepEqual(
    CommunityRuleValidation.create.parse({
      title: "  Be constructive  ",
      description: "  Explain disagreements  ",
    }),
    {
      title: "Be constructive",
      description: "Explain disagreements",
      orderNo: 0,
    },
  );
  assert.deepEqual(
    CommunityRuleValidation.update.parse({
      description: null,
    }),
    { description: null },
  );
  assert.deepEqual(
    CommunityRuleValidation.update.parse({
      title: "Updated",
    }),
    { title: "Updated" },
  );
  assert.equal(
    CommunityRuleValidation.communityIdParam.safeParse({
      communityId: validCuid,
    }).success,
    true,
  );
  assert.equal(
    CommunityRuleValidation.ruleIdParam.safeParse({ ruleId: validCuid })
      .success,
    true,
  );
});

test("Community Rule PATCH has no implicit order default and rejects empty bodies", () => {
  const titleOnly = CommunityRuleValidation.update.parse({ title: "Updated" });

  assert.equal("orderNo" in titleOnly, false);
  assert.equal(CommunityRuleValidation.update.safeParse({}).success, false);
});

test("Community Rule validation rejects invalid ranges and unknown fields", () => {
  assert.equal(
    CommunityRuleValidation.create.safeParse({
      title: "x".repeat(COMMUNITY_RULE_MAX_TITLE_LENGTH + 1),
    }).success,
    false,
  );
  assert.equal(
    CommunityRuleValidation.create.safeParse({
      title: "Rule",
      description: "x".repeat(COMMUNITY_RULE_MAX_DESCRIPTION_LENGTH + 1),
    }).success,
    false,
  );

  for (const orderNo of [-1, 1.5, COMMUNITY_RULE_MAX_ORDER + 1]) {
    assert.equal(
      CommunityRuleValidation.create.safeParse({
        title: "Rule",
        orderNo,
      }).success,
      false,
    );
  }

  assert.equal(
    CommunityRuleValidation.emptyQuery.safeParse({ page: "1" }).success,
    false,
  );
  assert.equal(
    CommunityRuleValidation.create.safeParse({
      title: "Rule",
      extra: true,
    }).success,
    false,
  );
  assert.equal(
    CommunityRuleValidation.ruleIdParam.safeParse({
      ruleId: ` ${validCuid} `,
    }).success,
    false,
  );
});
