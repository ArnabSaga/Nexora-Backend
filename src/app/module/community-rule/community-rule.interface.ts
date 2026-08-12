export type TCreateCommunityRulePayload = {
  title: string;
  description?: string | null;
  orderNo: number;
};

export type TUpdateCommunityRulePayload = {
  title?: string;
  description?: string | null;
  orderNo?: number;
};

export type TCommunityRuleResponse = {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  orderNo: number;
  createdAt: Date;
  updatedAt: Date;
};
