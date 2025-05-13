
/**
 * Defines the public API exposed by a test harness instance created
 * by `createTestHarness`.
 *
 * @template S The type of the service being tested.
 */
export interface TestHarnessApi<S = unknown> {
  mockSpan(arg0: any, tools: any, arg2: never[], required: boolean, arg4: boolean, span: fixtures.mockSpan, mockSpan: any, parameters: any, arg8: { temperature: number; }): Generator<import("effect/Utils").YieldWrap<import("effect/Effect").Effect<import("effect/Either").Either<unknown, unknown>, never, unknown>> | import("effect/Utils").YieldWrap<import("effect/Context").Tag<TestHarnessApi<unknown>, TestHarnessApi<unknown>>>, never, never>;
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
