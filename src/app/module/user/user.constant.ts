import type { Prisma } from "../../../generated/prisma/client";
import { PUBLIC_USER_COUNT_SELECT } from "../../shared/policies/user.policy";
import { IQueryConfig } from "../../shared/types/query.types";

export const USER_SEARCHABLE_FIELDS = [
  "name",
  "email",
  "profile.username",
] as const;

export const USER_FILTERABLE_FIELDS = ["role", "status"] as const;

export const USER_SORTABLE_FIELDS = [
  "createdAt",
  "updatedAt",
  "lastLoginAt",
  "name",
  "email",
] as const;

export const DEFAULT_USER_SELECT = {
  id: true,
  name: true,
  image: true,
  createdAt: true,
  profile: {
    select: {
      id: true,
      username: true,
      avatar: true,
      headline: true,
    },
  },
  _count: {
    select: PUBLIC_USER_COUNT_SELECT,
  },
} satisfies Prisma.UserSelect;

export const ADMIN_USER_SELECT = {
  ...DEFAULT_USER_SELECT,
  email: true,
  emailVerified: true,
  role: true,
  status: true,
  lastLoginAt: true,
  deletedAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const USER_LIST_QUERY_CONFIG: IQueryConfig = {
  filterableFields: [...USER_FILTERABLE_FIELDS],
  sortableFields: [...USER_SORTABLE_FIELDS],
  defaultSortBy: "createdAt",
  defaultSortOrder: "desc",
  defaultLimit: 10,
  maxLimit: 100,
};
