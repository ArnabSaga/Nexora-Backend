export type TDatabaseIdentity = {
  host: string;
  port: string;
  database: string;
  schema: string;
  isLoopback: boolean;
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const parseDatabaseIdentity = (
  value: string,
  variableName: string,
): TDatabaseIdentity => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${variableName} must use postgres: or postgresql:`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!host || !database) {
    throw new Error(`${variableName} must include a host and database name`);
  }

  return {
    host,
    port: url.port || "5432",
    database,
    schema: url.searchParams.get("schema") || "public",
    isLoopback: LOOPBACK_HOSTS.has(host),
  };
};

export const assertIsolatedDatabase = (
  databaseUrl: string,
  testDatabaseUrl: string,
) => {
  const normal = parseDatabaseIdentity(databaseUrl, "DATABASE_URL");
  const test = parseDatabaseIdentity(testDatabaseUrl, "TEST_DATABASE_URL");

  const sameIdentity =
    normal.host === test.host &&
    normal.port === test.port &&
    normal.database === test.database &&
    normal.schema === test.schema;
  const sameLoopbackDatabase =
    normal.isLoopback &&
    test.isLoopback &&
    normal.database === test.database;

  if (sameIdentity || sameLoopbackDatabase) {
    throw new Error(
      "TEST_DATABASE_URL must identify a different PostgreSQL database from DATABASE_URL",
    );
  }
};
