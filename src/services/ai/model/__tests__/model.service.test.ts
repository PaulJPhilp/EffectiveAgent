import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ModelConfigError } from "../errors.js";
import { ModelService } from "../service.js";


const fileSystemLayer = NodeFileSystem.layer;
const configurationLayer = Layer.provide(ConfigurationService.Default, fileSystemLayer);

describe("ModelService (models.dev hydration)", () => {
  beforeEach(() => {
    process.env.MODELS_CONFIG_PATH = join(process.cwd(), "src/services/ai/model/__tests__/config/models.json");
  });

  it("hydrates local model entries from models.dev (happy path)", () => {
    class TestModelsRegistryService extends Effect.Service<any>()("TestModelsRegistry", {
      effect: Effect.succeed({ list: Effect.succeed([{ id: "gpt-4o", contextWindow: 12345, pricing: { input: 0.02 } }]) }),
    }) { }

    const modelServiceLayer = Layer.provide(ModelService.Default, Layer.mergeAll(configurationLayer, TestModelsRegistryService.Default));

    return Effect.gen(function* () {
      const svc = yield* ModelService;
      const loaded = yield* svc.load();
      const hydrated = loaded.models.find((m: any) => m.id === "gpt-4o");
      expect(hydrated).toBeDefined();
      expect(hydrated?.contextWindow).toBe(12345);
      expect((hydrated?.pricing as any)?.input).toBe(0.02);
    }).pipe(Effect.provide(modelServiceLayer));
  });

  it("fails initialization when a local model is missing from models.dev (failure path)", () => {
    const testDir = join(process.cwd(), "test-models");
    mkdirSync(testDir, { recursive: true });
    const badPath = join(testDir, "bad-models.json");
    writeFileSync(badPath, JSON.stringify({ name: "bad", version: "1.0", models: [{ id: "gpt-4-oopsie" }] }));
    process.env.MODELS_CONFIG_PATH = badPath;

    class TestModelsRegistryService extends Effect.Service<any>()("TestModelsRegistry", {
      effect: Effect.succeed({ list: Effect.succeed([{ id: "gpt-4o" }]) }),
    }) { }

    const modelServiceLayer = Layer.provide(ModelService.Default, Layer.mergeAll(configurationLayer, TestModelsRegistryService.Default));

    return Effect.gen(function* () {
      const initResult = yield* Effect.either(Effect.gen(function* () { return yield* ModelService; }));
      rmSync(testDir, { recursive: true, force: true });

      expect(Either.isLeft(initResult)).toBe(true);
      if (Either.isLeft(initResult)) {
        expect(initResult.left).toBeInstanceOf(ModelConfigError);
      }
    }).pipe(Effect.provide(modelServiceLayer));
  });
});

