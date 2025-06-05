import { Effect } from "effect";
import type { MockModelServiceApi } from "./api.js";

/**
 * MockModelService class definition.
 */
export class MockModelService extends Effect.Service<MockModelServiceApi>()("MockModelService") { } 