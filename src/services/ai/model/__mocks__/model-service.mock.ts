import { Effect } from "effect";
import type { ModelServiceApi } from "../api.js";
import type { ModelFile, PublicModelInfoDefinition } from "../schema.js";

/**
 * Mock implementation returning the PublicModelInfoDefinition structure.
 */

const testModel: PublicModelInfoDefinition = {
  id: "test-model-id",
  name: "TestModel",
  version: "0.1.0",
  provider: "test-provider",
  modelName: "TestModelName",
  displayName: "Test Model Display Name",
  vendorCapabilities: ["chat", "tool-use"],
  contextWindowSize: 4096
};

const testModelFile: ModelFile = {
  models: [testModel],
  name: "test-model-config",
  version: "0.1.0"
};

export const MockModelService: ModelServiceApi = {
  load: () => Effect.succeed(testModelFile),
  exists: (_modelId: string) => Effect.succeed(true),
  getProviderName: (_modelId: string) => Effect.succeed(testModel.provider),
  findModelsByCapability: () => Effect.succeed([testModel]),
  findModelsByCapabilities: () => Effect.succeed([testModel]),
  getDefaultModelId: () => Effect.succeed(testModel.id),
  getModelsForProvider: () => Effect.succeed([testModel as any]),
  validateModel: () => Effect.succeed(true),
};
