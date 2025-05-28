import { Effect, LogLevel } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { FileSystem } from "@effect/platform";
import { AgentRuntime } from "./agent-runtime.js";
import { MasterConfig } from "./core/config/types.js";
import { describe, expect, it } from "vitest";
import { MasterConfigData } from "./core/config/master-config-schema.js";

describe("AgentRuntime", () => {
  const testConfig: MasterConfigData = {
    version: "1.0.0",
    runtimeSettings: {
      fileSystemImplementation: "node"
    },
    logging: {
      level: "info",
      filePath: "/tmp/test-agent.log"
    },
    configPaths: {
      providers: "./config/providers.json",
      models: "./config/models.json",
      policy: "./config/policy.json"
    }
  };

  describe("initialize", () => {
    it("should initialize logger with correct configuration", () =>
      Effect.gen(function* () {
        // Create runtime
        const runtime = yield* AgentRuntime.initialize(testConfig);
        
        // Log a test message
        yield* Effect.logInfo("Test log message");

        // Verify log file exists and contains message
        const fs = yield* FileSystem.FileSystem;
        const exists = yield* fs.exists(testConfig.logging.filePath);
        expect(exists).toBe(true);

        const buffer = yield* fs.readFile(testConfig.logging.filePath);
        const content = new TextDecoder().decode(buffer);
        expect(content).toContain("Test log message");
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });

  describe("runEffect and runPromise", () => {
    it("should run effects with runtime services", () =>
      Effect.gen(function* () {
        // Create runtime
        const runtime = yield* AgentRuntime.initialize(testConfig);
        
        // Create a test effect
        const testEffect = Effect.succeed("test value");
        
        // Test runEffect
        const effectResult = yield* runtime.runEffect(testEffect);
        expect(effectResult).toBe("test value");
        
        // Test runPromise
        const promiseResult = yield* Effect.promise(() => 
          runtime.runPromise(testEffect)
        );
        expect(promiseResult).toBe("test value");
      })
    );
  });

  describe("shutdown", () => {
    it("should shutdown cleanly", () =>
      Effect.gen(function* () {
        // Create runtime
        const runtime = yield* AgentRuntime.initialize(testConfig);
        
        // Test shutdown
        yield* Effect.promise(() => runtime.shutdown());
        
        // Verify shutdown log message
        const buffer = yield* FileSystem.FileSystem.pipe(
          Effect.flatMap(fs => fs.readFile(testConfig.logging.filePath))
        );
        const content = new TextDecoder().decode(buffer);
        expect(content).toContain("Shutting down AgentRuntime");
      }).pipe(
        Effect.provide(NodeFileSystem.layer)
      )
    );
  });
});
