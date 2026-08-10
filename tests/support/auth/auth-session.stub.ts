import { auth } from "../../../src/app/lib/auth";

type TGetSession = (input: { headers: Headers }) => Promise<unknown>;

export const installAuthSessionStub = (sessionId: string) => {
  const authApi = auth.api as unknown as { getSession: TGetSession };
  const originalGetSession = authApi.getSession;

  authApi.getSession = async ({ headers }) => {
    const userId = headers.get("x-test-user-id");

    return userId
      ? {
          user: { id: userId },
          session: { id: sessionId },
        }
      : null;
  };

  return () => {
    authApi.getSession = originalGetSession;
  };
};
