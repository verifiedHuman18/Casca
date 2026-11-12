import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The integration tests share one database and truncate it between tests,
    // so test files must not run at the same time.
    fileParallelism: false,
  },
});
