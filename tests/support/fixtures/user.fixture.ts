import { UserStatus } from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestUserInput = {
  cleanup: TTestCleanup;
  runId: string;
  label: string;
  status?: UserStatus;
};

export const createTestUser = async ({
  cleanup,
  runId,
  label,
  status = UserStatus.ACTIVE,
}: TCreateTestUserInput) => {
  const user = await prisma.user.create({
    data: {
      name: `Test ${label}`,
      email: `${runId}-${label}@example.test`,
      status,
    },
  });

  cleanup.add(`user:${user.id}`, () =>
    prisma.user.deleteMany({ where: { id: user.id } }),
  );

  return user;
};
