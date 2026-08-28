import status from "http-status";
import AppError from "../../shared/errors/AppError";

const PROFILE_MEDIA_CAS_MAX_ATTEMPTS = 3;

export type TProfileMediaField = "avatar" | "coverPhoto";

export type TProfileMediaCasRow = {
  userId: string;
  avatar: string | null;
  coverPhoto: string | null;
  updatedAt: Date;
};

type TProfileMediaCasDependencies = {
  read(userId: string): Promise<TProfileMediaCasRow | null>;
  compareAndSwap(input: {
    userId: string;
    field: TProfileMediaField;
    expectedUrl: string | null;
    uploadedUrl: string;
  }): Promise<TProfileMediaCasRow[]>;
};

export const createProfileMediaCasWriter = (
  dependencies: TProfileMediaCasDependencies,
) => ({
  claim: async (input: {
    userId: string;
    field: TProfileMediaField;
    initialExpectedUrl: string | null;
    uploadedUrl: string;
  }) => {
    let expectedUrl = input.initialExpectedUrl;

    for (
      let attempt = 1;
      attempt <= PROFILE_MEDIA_CAS_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const rows = await dependencies.compareAndSwap({
        userId: input.userId,
        field: input.field,
        expectedUrl,
        uploadedUrl: input.uploadedUrl,
      });

      if (rows.length > 1) {
        throw new AppError(
          status.INTERNAL_SERVER_ERROR,
          "Profile media update invariant failed",
        );
      }
      if (rows[0]) {
        return {
          row: rows[0],
          replacedUrl: expectedUrl,
        };
      }
      if (attempt < PROFILE_MEDIA_CAS_MAX_ATTEMPTS) {
        const fresh = await dependencies.read(input.userId);
        if (!fresh) {
          throw new AppError(status.NOT_FOUND, "Profile not found");
        }
        expectedUrl = fresh[input.field];
      }
    }

    throw new AppError(status.CONFLICT, "Profile media changed concurrently");
  },
});

export type TProfileMediaCasWriter = ReturnType<
  typeof createProfileMediaCasWriter
>;
