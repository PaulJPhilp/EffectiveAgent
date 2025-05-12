import { Effect, Either } from "effect";
import { describe, it } from "vitest";
import { ToolRegistryService } from "/Users/paul/Projects/EffectiveAgent/src/services/ai/tool-registry/service.js";

describe("ToolRegistryService", () => {
  it("should return registry data", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const result = yield* service.getRegistryData();

      if (!result?.tools || !result?.metadata) {
        throw new Error("Expected registry data with tools and metadata");
      }
    }));

  it("should get tool by name", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const tool = yield* service.getTool("test-toolkit:test-tool");

      if (!tool?.name || !tool?.description) {
        throw new Error("Expected tool with name and description");
      }
    }));

  it("should get toolkit by name", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const toolkit = yield* service.getToolkit("test-toolkit");

      if (!toolkit?.name || !toolkit?.description || !toolkit?.tools) {
        throw new Error("Expected toolkit with name, description and tools");
      }
    }));

  it("should fail when tool not found", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const result = yield* Effect.either(service.getTool("invalid:tool"));

      if (!Either.isLeft(result)) {
        throw new Error("Expected tool not found error");
      }
    }));

  it("should fail when toolkit not found", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const result = yield* Effect.either(service.getToolkit("invalid-toolkit"));
      
      if (!Either.isLeft(result)) {
        throw new Error("Expected toolkit not found error");
      }
    }));

  it("should handle invalid tool name format", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const result = yield* Effect.either(service.getTool("invalid:nodot"));
      
      if (!Either.isLeft(result)) {
        throw new Error("Expected error for invalid tool name format");
      }
    }));

  it("should list all tools", () =>
    Effect.gen(function* () {
      const service = yield* ToolRegistryService;
      const tools = yield* service.listTools();
      
      if (!Array.isArray(tools)) {
        throw new Error("Expected array of tool names");
      }

      const hasValidFormat = tools.every(name => name.includes(":"));
      if (!hasValidFormat) {
        throw new Error("Expected all tool names to be in namespace:name format");
      }
    }));
});
