import "dotenv/config";

import { randomUUID } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { assertIsolatedDatabase } from "../support/database/test-database";

const collectTestFiles = (inputPath: string): string[] => {
  const absolutePath = resolve(inputPath);
  const stats = statSync(absolutePath);

  if (stats.isFile()) {
    return absolutePath.endsWith(".test.ts") ? [absolutePath] : [];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) =>
    collectTestFiles(resolve(absolutePath, entry.name)),
  );
};

const resolveTestFiles = (inputs: string[]) =>
  [...new Set(inputs.flatMap(collectTestFiles))]
    .sort()
    .map((filePath) => relative(process.cwd(), filePath));

const run = (command: string, args: string[], environment: NodeJS.ProcessEnv) => {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  return true;
};

const main = () => {
  const inputs = process.argv.slice(2);

  if (!inputs.length) {
    throw new Error("At least one integration test file or directory is required");
  }

  const testFiles = resolveTestFiles(inputs);

  if (!testFiles.length) {
    throw new Error("No .test.ts integration files were found");
  }

  const databaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for isolation comparison");
  }

  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for integration tests");
  }

  assertIsolatedDatabase(databaseUrl, testDatabaseUrl);

  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    TEST_RUN_ID: `test-${randomUUID()}`,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "test-gemini-key",
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "test-gemini-model",
  };
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  if (!run(pnpmCommand, ["exec", "prisma", "migrate", "deploy"], environment)) {
    return;
  }

  run(
    pnpmCommand,
    ["exec", "tsx", "--test", "--test-concurrency=1", ...testFiles],
    environment,
  );
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown test error";

  console.error(`Integration test setup failed: ${message}`);
  process.exitCode = 1;
}
