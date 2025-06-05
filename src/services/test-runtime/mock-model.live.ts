import { Effect, Layer } from "effect";
import type { MockModelServiceApi } from "./api.js";
import { EffectiveRuntime } from "./effective-runtime.service.js";
import { MockModelService } from "./mock-model.service.js";

const makeMockModelService = Effect.gen(function* () {
    // This service depends on EffectiveRuntime to demonstrate the pattern,
    // though in this simple mock, it doesn't actually use it for its own methods here.
    // It's yielded to ensure the dependency is correctly resolved if needed.
    const _effectiveRuntime = yield* EffectiveRuntime;
    yield* Effect.log("MockModelService live instance created");

    return {
        getModelName: (id: string) => Effect.succeed(`MockModel-${id}`)
    } satisfies MockModelServiceApi;
});

export const MockModelServiceLiveLayer = Layer.effect(
    MockModelService,
    makeMockModelService
); 