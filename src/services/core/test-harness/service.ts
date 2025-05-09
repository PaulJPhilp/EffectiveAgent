import { ConfigProvider, Context, Layer } from "effect";
import { TestHarnessApi } from "./api.js";
import { AssertionHelperService } from "./components/assertion-helpers/service.js";
import { EffectRunnerService } from "./components/effect-runners/service.js";
import { FixtureService } from "./components/fixtures/service.js";
import { MockAccessorService } from "./components/mock-accessors/service.js";

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
    readonly fixtures: TestHarnessApi["fixtures"]
  ) { }
  context: ContextApi;
}

/**
 * Create the live layer for the TestHarnessService
 */
export const TestHarnessServiceLiveLayer = Layer.provide(
  Layer.succeed(
    TestHarnessService,
    new TestHarnessServiceImpl(
      new EffectRunnerService(),
      new AssertionHelperService(),
      new MockAccessorService(),
      new FixtureService()
    )
  ),
  ConfigProvider.layer
);

export default TestHarnessService;
