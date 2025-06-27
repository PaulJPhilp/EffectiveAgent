import { Effect, Chunk } from "effect";
import { describe, expect, it } from "vitest";
import { makeGoogleClient } from "../google-provider-client.js";
import { ProviderChatOptions } from "../../types.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { EffectImplementation, HttpImplementation, McpImplementation, ToolMetadata, type ToolDefinition } from "@/services/ai/tools/schema.js";
import { NodeFileSystem, NodeHttpClient } from "@effect/platform-node";
import { ModelService } from "@/services/ai/model/service.js";
import { EffectiveMessage, TextPart } from "@/schema.js";
import { EffectiveInput } from "@/types.js";
import { FileSystem, HttpClient } from "@effect/platform";
import { GenerateTextResult } from "../../types.js";

describe("Google Tool Integration Tests", () => {
  const createTestClient = () =>
    Effect.gen(function* () {
      // Create the client with tool support
      const client = yield* makeGoogleClient("test-api-key");
      const toolRegistry = yield* ToolRegistryService;
      const toolNames = yield* toolRegistry.listTools();
      const effectiveTools = yield* Effect.forEach(toolNames, name => toolRegistry.getTool(name));

      // Convert EffectiveTool to ToolDefinition
      const tools = effectiveTools.map(tool => {
        // Create implementation based on tool type
        let implementation;
        switch (tool.implementation) {
          case "Effect":
            implementation = {
              _tag: "EffectImplementation" as const,
              inputSchema: tool.inputSchema,
              outputSchema: tool.outputSchema,
              execute: (args: Record<string, unknown>) => Effect.succeed(args)
            } as const;
            break;
          case "Http":
            implementation = {
              _tag: "HttpImplementation" as const,
              inputSchema: tool.inputSchema,
              outputSchema: tool.outputSchema,
              url: "http://localhost:8080",
              method: "GET" as const
            } as const;
            break;
          case "Mcp":
            implementation = {
              _tag: "McpImplementation" as const,
              inputSchema: tool.inputSchema,
              outputSchema: tool.outputSchema,
              slug: "test-mcp"
            } as const;
            break;
          default:
            throw new Error(`Unknown implementation type: ${tool.implementation}`);
        }

        return {
          metadata: tool.toolMetadata,
          implementation
        } satisfies ToolDefinition;
      });

      // Standard chat options with tools enabled
      const options: ProviderChatOptions = {
        modelId: "gemini-1.5-flash-latest",
        tools,
      };

      return { client, toolRegistry, options };
    });

  // Helper to create test input
  const createTestInput = (text: string): EffectiveInput => ({
    text,
    messages: Chunk.fromIterable([
      {
        role: "user",
        parts: Chunk.fromIterable([{
          _tag: "Text",
          type: "text",
          content: text
        } as TextPart])
      } as EffectiveMessage
    ])
  });

  // Test each tool
  describe("Wikipedia Tool", () => {
    it("should search Wikipedia", () =>
      Effect.gen(function* () {
        const { client, options } = yield* createTestClient();
        const input = createTestInput("Search Wikipedia for information about Effect programming");

        const result = yield* client.generateText(input, options);

        expect(result.data.text).toBeDefined();
        expect(result.data.toolCalls).toBeDefined();
        expect(result.data.toolCalls?.length).toBeGreaterThan(0);
      }).pipe(
        Effect.provide(ToolRegistryService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(NodeHttpClient.layer)
      ));
  });

  describe("DateTime Tool", () => {
    it("should get current time", () =>
      Effect.gen(function* () {
        const { client, options } = yield* createTestClient();
        const input = createTestInput("What is the current time in ISO format?");

        const result = yield* client.generateText(input, options);

        expect(result.data.text).toBeDefined();
        expect(result.data.toolCalls).toBeDefined();
        expect(result.data.toolCalls?.length).toBeGreaterThan(0);
      }).pipe(
        Effect.provide(ToolRegistryService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(NodeHttpClient.layer)
      ));
  });

  describe("HackerNews Tool", () => {
    it("should fetch top stories", () =>
      Effect.gen(function* () {
        const { client, options } = yield* createTestClient();
        const input = createTestInput("Get the top 5 stories from Hacker News");

        const result = yield* client.generateText(input, options);

        expect(result.data.text).toBeDefined();
        expect(result.data.toolCalls).toBeDefined();
        expect(result.data.toolCalls?.length).toBeGreaterThan(0);
      }).pipe(
        Effect.provide(ToolRegistryService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(NodeHttpClient.layer)
      ));
  });

  describe("PDF Tool", () => {
    it("should extract text from PDF", () =>
      Effect.gen(function* () {
        const { client, options } = yield* createTestClient();
        const input = createTestInput("Extract text from the PDF file at test/data/05-versions-space.pdf");

        const result = yield* client.generateText(input, options);

        expect(result.data.text).toBeDefined();
        expect(result.data.toolCalls).toBeDefined();
        expect(result.data.toolCalls?.length).toBeGreaterThan(0);
      }).pipe(
        Effect.provide(ToolRegistryService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(NodeFileSystem.layer),
        Effect.provide(NodeHttpClient.layer)
      ));
  });

  describe("Web Search Tool", () => {
    it("should perform web search", () =>
      Effect.gen(function* () {
        const { client, options } = yield* createTestClient();
        const input = createTestInput("Search the web for recent news about artificial intelligence");

        const result = yield* client.generateText(input, options);

        expect(result.data.text).toBeDefined();
        expect(result.data.toolCalls).toBeDefined();
        expect(result.data.toolCalls?.length).toBeGreaterThan(0);
      }).pipe(
        Effect.provide(ToolRegistryService.Default),
        Effect.provide(ModelService.Default),
        Effect.provide(NodeHttpClient.layer)
      ));
  });
});
