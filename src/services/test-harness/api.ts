import type { EffectRunnerApi } from "./components/effect-runners/api.ts";
import type { AssertionHelperApi } from "./components/assertion-helpers/api.ts";
import type { MockAccessorApi } from "./components/mock-accessors/api.ts";
import type { FixtureApi } from "./components/fixtures/api.ts";
import type { ContextApi } from "./components/context/api.ts";

/**
 * Defines the public API exposed by a test harness instance created
 * by `createTestHarness`.
 *
 * @template S The type of the service being tested.
 */
export interface TestHarnessApi<S = unknown> {
  /**
   * Provides access to Effect runner functions.
   */
  runners: EffectRunnerApi;

  /**
   * Provides access to assertion helper functions.
   */
  assertions: AssertionHelperApi;

  /**
   * Provides access to standard mock objects.
   */
  mocks: MockAccessorApi;

  /**
   * Provides access to standard fixtures.
   */
  fixtures: FixtureApi;

  /**
   * Provides access to context management functions.
   */
  context: ContextApi;

  // Placeholder for other component APIs (fixtures, etc.)
}
