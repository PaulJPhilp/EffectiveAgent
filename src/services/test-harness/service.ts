import { Effect, Layer, Context } from "effect";
import { TestHarnessApi } from "./api.js";
import { EffectRunnerService } from "./components/effect-runners/service.js";
import { AssertionHelperService } from "./components/assertion-helpers/service.js";
import { MockAccessorService } from "./components/mock-accessors/service.js";
import { FixtureService } from "./components/fixtures/service.js";

/**
 * Define the TestHarnessService tag
 */
export const TestHarnessService = Context.GenericTag<TestHarnessApi>("TestHarnessService");

/**
 * Implementation of the TestHarnessService class
 */
export class TestHarnessServiceImpl implements TestHarnessApi {
  constructor(
    readonly runners: TestHarnessApi["runners"],
    readonly assertions: TestHarnessApi["assertions"],
    readonly mocks: TestHarnessApi["mocks"],
    readonly fixtures: TestHarnessApi["fixtures"],
    readonly context: TestHarnessApi["context"]
  ) {}

  /**
   * Create a TestHarnessService instance
   */
  static make = Effect.gen(function* () {
    const runners = yield* EffectRunnerService;
    const assertions = yield* AssertionHelperService;
    const mocks = yield* MockAccessorService;
    const fixtures = yield* FixtureService;
    
    // Since ContextService doesn't exist yet, create a simple placeholder
    const context = {
      // Add basic context management functions here
      createContext: () => Effect.succeed({}),
      getContext: () => Effect.succeed({})
    };

    return new TestHarnessServiceImpl(runners, assertions, mocks, fixtures, context);
  });
}

/**
 * Creates a Layer that provides the TestHarnessService.
 */
export const TestHarnessLayer = Layer.effect(
  TestHarnessService,
  TestHarnessServiceImpl.make
);

export default TestHarnessService;
