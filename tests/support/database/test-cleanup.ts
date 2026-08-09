type TCleanupTask = {
  label: string;
  execute: () => Promise<unknown>;
};

export type TTestCleanup = ReturnType<typeof createTestCleanup>;

export const createTestCleanup = () => {
  const tasks: TCleanupTask[] = [];

  const add = (label: string, execute: TCleanupTask["execute"]) => {
    tasks.push({ label, execute });
  };

  const run = async () => {
    const failures: Error[] = [];

    for (const task of tasks.reverse()) {
      try {
        await task.execute();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(new Error(`${task.label}: ${message}`));
      }
    }

    tasks.length = 0;

    if (failures.length) {
      throw new AggregateError(failures, "Test fixture cleanup failed");
    }
  };

  return { add, run };
};
