import { Effect, Layer } from "effect";
import { MasterConfig } from "./types.js";
import { MasterConfigData } from "./master-config-schema.js";

/**
 * Creates a test master config layer with the given overrides
 */
export const makeTestMasterConfig = (overrides: Partial<MasterConfigData>) => {
  const defaultConfig: MasterConfigData = {
    version: "1.0.0",
    runtimeSettings: {
      fileSystemImplementation: "node"
    },
    logging: {
      filePath: "logs/test.log",
      level: "debug"
    },
    configPaths: {
      policy: "config/policy.json",
      models: "config/models.json",
      providers: "config/providers.json"
    },
    ...overrides
  };

  return Layer.succeed(
    MasterConfig,
    defaultConfig
  );
};
