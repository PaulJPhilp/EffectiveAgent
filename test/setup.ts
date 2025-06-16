import { Effect } from "effect";
import { beforeAll, afterEach } from "vitest";

// Configure test environment
beforeAll(() => {
  // Set up any global test configuration
  process.env.NODE_ENV = "test";
});

// Clean up after each test
afterEach(() => {
  // Reset any test state
  Effect.runSync(Effect.succeed(undefined));
});
