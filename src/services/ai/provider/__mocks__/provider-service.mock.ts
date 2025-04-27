import type { ProviderServiceApi } from "../api.js";
import type { ProviderFile } from "../schema.js";
import type { ProviderClientApi } from "../api.js";
import { Effect } from "effect";

/**
 * Minimal mock ProviderServiceApi implementation for testing.
 * Returns static valid data and always succeeds.
 * Extend as needed for more complex test scenarios.
 */

const testProviderFile: ProviderFile = {
  providers: [
    {
      name: "test-provider",
      displayName: "Test Provider",
      type: "llm",
      apiKeyEnvVar: "TEST_PROVIDER_API_KEY"
    }
  ],
  name: "test-provider-config",
  description: "Test config for ProviderService"
};

// Minimal ProviderClientApi mock (expand as needed)
const MockProviderClient: ProviderClientApi = {
  setVercelProvider: () => Effect.succeed(undefined),
  getProvider: () => Effect.succeed({} as any),
  generateText: () => Effect.succeed({} as any),
  generateEmbeddings: () => Effect.succeed({} as any),
  getCapabilities: () => Effect.succeed(new Set(["embeddings"])),
  getModels: () => Effect.succeed([]),
  generateObject: () => Effect.succeed({} as any),
  generateSpeech: () => Effect.succeed({} as any),
  transcribe: () => Effect.succeed({} as any),
};

export const MockProviderService: ProviderServiceApi = {
  load: Effect.succeed(testProviderFile),
  getProviderClient: (_providerName: string) => Effect.succeed(MockProviderClient)
};
