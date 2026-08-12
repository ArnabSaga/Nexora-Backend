import status from "http-status";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";

type TTargetMembership = {
  id: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
};

type TManagementContext = {
  requesterRole: CommunityMemberRole | null;
  targetMembership: TTargetMembership | null;
};

type TCommunityMemberRoleUpdateDependencies<TMembershipPayload> = {
  resolveManagementContext: () => Promise<TManagementContext>;
  compareAndSwapRole: (
    membership: TTargetMembership,
    requestedRole: CommunityMemberRole,
  ) => Promise<boolean>;
  readMembership: (membershipId: string) => Promise<TMembershipPayload>;
  writeRoleNotification: () => Promise<void>;
  maxAttempts?: number;
};

export const createCommunityMemberRoleUpdateService = <TMembershipPayload>({
  resolveManagementContext,
  compareAndSwapRole,
  readMembership,
  writeRoleNotification,
  maxAttempts = 3,
}: TCommunityMemberRoleUpdateDependencies<TMembershipPayload>) => {
  const updateMemberRole = async (
    requestedRole: CommunityMemberRole,
  ): Promise<TMembershipPayload> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { requesterRole, targetMembership } =
        await resolveManagementContext();

      if (
        !targetMembership ||
        targetMembership.status !== CommunityMemberStatus.ACTIVE
      ) {
        throw new AppError(status.NOT_FOUND, "Community member not found");
      }
      if (targetMembership.role === CommunityMemberRole.OWNER) {
        throw new AppError(
          status.FORBIDDEN,
          "Community owner cannot be modified",
        );
      }

      const ownerAllowed = requesterRole === CommunityMemberRole.OWNER;
      const adminAllowed =
        requesterRole === CommunityMemberRole.ADMIN &&
        targetMembership.role !== CommunityMemberRole.ADMIN &&
        requestedRole !== CommunityMemberRole.ADMIN;

      if (!ownerAllowed && !adminAllowed) {
        throw new AppError(status.NOT_FOUND, "Community member not found");
      }

      if (targetMembership.role === requestedRole) {
        return readMembership(targetMembership.id);
      }

      if (await compareAndSwapRole(targetMembership, requestedRole)) {
        await writeRoleNotification();
        return readMembership(targetMembership.id);
      }
    }

    throw new AppError(
      status.CONFLICT,
      "Community member role changed concurrently",
    );
  };

  return { updateMemberRole };
};
