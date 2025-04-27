import type { ModelServiceApi } from "../service.js";
import type { Model, ModelFile } from "../schema.js";
import { Effect } from "effect";

/**
 * Minimal mock ModelServiceApi implementation for testing.
 * Returns static valid data and always succeeds.
 * Extend as needed for more complex test scenarios.
 */

const testModel: Model = {
  id: "test-model-id",
  name: "Test Model",
  provider: "test-provider",
  capabilities: ["embeddings"],
  version: "0.1.0",
  modelName: "Test Model"
};

const testModelFile: ModelFile = {
  models: [testModel],
  name: "test-model-config",
  version: "0.1.0"
};

export const MockModelService: ModelServiceApi = {
  load: () => Effect.succeed(testModelFile),
  getProviderName: (_modelId: string) => Effect.succeed("test-provider"),
  findModelsByCapability: () => Effect.succeed([testModel]),
  findModelsByCapabilities: () => Effect.succeed([testModel]),
  getDefaultModelId: () => Effect.succeed("test-model-id"),
  getModelsForProvider: () => Effect.succeed([testModel as any]), // Replace with LanguageModelV1 mock if needed
  validateModel: () => Effect.succeed(true),
};
