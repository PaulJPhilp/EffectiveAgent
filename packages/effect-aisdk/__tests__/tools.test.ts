import type { LanguageModelV1 } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, defineToolWithDescription } from "../src/tools/index.js";
import {
    createAnthropicToolDefinitions,
    createOpenAIToolDefinitions,
    prepareToolDefinitionsForProvider,
} from "../src/tools/providers.js";
import { parseToolArguments, toJsonSchema } from "../src/tools/schema.js";

describe("Tool System", () => {
    describe("Tool Definition", () => {
        it("should create a tool with defineTool", () => {
            const schema = z.object({ query: z.string() });
            const handler = async (args: any) => args.query.toUpperCase();

            const tool = defineTool("transform", schema, handler);

            expect(tool.definition.name).toBe("transform");
            expect(tool.handler).toBe(handler);
        });

        it("should create a tool with description", () => {
            const schema = z.object({ query: z.string() });
            const handler = async (args: any) => args.query;

            const tool = defineToolWithDescription(
                "test",
                "Test tool",
                schema,
                handler
            );

            expect(tool.definition.description).toBe("Test tool");
        });
    });

    describe("Schema Conversion", () => {
        it("should convert Zod schema to JSON Schema", () => {
            const schema = z.object({
                name: z.string(),
                age: z.number().optional(),
            });

            const jsonSchema = toJsonSchema(schema);

            expect(jsonSchema.type).toBe("object");
            expect(jsonSchema.properties).toHaveProperty("name");
            expect(jsonSchema.properties).toHaveProperty("age");
            expect(jsonSchema.required).toContain("name");
            expect(jsonSchema.required?.indexOf("age")).toBe(-1);
        });

        it("should convert JSON Schema directly", () => {
            const schema = {
                type: "object",
                properties: { test: { type: "string" } },
            };

            const jsonSchema = toJsonSchema(schema as any);

            expect(jsonSchema).toBe(schema);
        });
    });

    describe("Schema Parsing", () => {
        it("should parse valid arguments with Zod schema", async () => {
            const schema = z.object({ query: z.string() });
            const result = await parseToolArguments({ query: "test" }, schema);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.query).toBe("test");
            }
        });

        it("should reject invalid arguments", async () => {
            const schema = z.object({ query: z.string() });
            const result = await parseToolArguments({ query: 123 }, schema);

            expect(result.success).toBe(false);
        });

        it("should detect missing required fields with JSON Schema", async () => {
            const schema = {
                type: "object",
                properties: { query: { type: "string" } },
                required: ["query"],
            };

            const result = await parseToolArguments({}, schema as any);

            expect(result.success).toBe(false);
        });
    });

    describe("Provider Tool Definitions", () => {
        it("should create OpenAI tool definitions", () => {
            const tool = defineTool(
                "test",
                z.object({ input: z.string() }),
                async (args) => args
            );

            const definitions = createOpenAIToolDefinitions([tool]);

            expect(definitions).toHaveLength(1);
            expect(definitions[0].type).toBe("function");
            expect(definitions[0].function.name).toBe("test");
        });

        it("should create Anthropic tool definitions", () => {
            const tool = defineTool(
                "test",
                z.object({ input: z.string() }),
                async (args) => args
            );

            const definitions = createAnthropicToolDefinitions([tool]);

            expect(definitions).toHaveLength(1);
            expect(definitions[0].name).toBe("test");
            expect(definitions[0].input_schema).toBeDefined();
        });
    });

    describe("Tool Orchestration", () => {
        const mockModel = {
            modelId: "gpt-4o-mini",
        } as LanguageModelV1;

        it("should detect provider from model", () => {
            const tools = [
                defineTool("test", z.object({}), async () => ({})),
            ];

            const { provider } = prepareToolDefinitionsForProvider(mockModel, tools);

            expect(provider).toBe("openai");
        });

        it("should prepare tool definitions for provider", () => {
            const tool = defineTool(
                "search",
                z.object({ query: z.string() }),
                async (args) => ({ results: [] })
            );

            const { toolDefinitions } = prepareToolDefinitionsForProvider(
                mockModel,
                [tool]
            );

            expect(toolDefinitions).toHaveLength(1);
            expect((toolDefinitions[0] as any).function.name).toBe("search");
        });
    });

    describe("Tool Handler Execution", () => {
        it("should execute a tool handler", async () => {
            const handler = async (args: any) => ({ result: "success", input: args });
            const result = await handler({ query: "test" });

            expect(result.result).toBe("success");
            expect(result.input).toEqual({ query: "test" });
        });

        it("should handle tool handler errors", async () => {
            const handler = async () => {
                throw new Error("Handler failed");
            };

            let error: Error | null = null;
            try {
                await handler();
            } catch (e) {
                error = e as Error;
            }

            expect(error?.message).toBe("Handler failed");
        });
    });

    describe("Tool System Integration", () => {
        it("should create multiple tools", () => {
            const tools = [
                defineTool("add", z.object({ a: z.number(), b: z.number() }), async (args) => args.a + args.b),
                defineTool("subtract", z.object({ a: z.number(), b: z.number() }), async (args) => args.a - args.b),
            ];

            expect(tools).toHaveLength(2);
            expect(tools[0].definition.name).toBe("add");
            expect(tools[1].definition.name).toBe("subtract");
        });

        it("should handle tool with complex schema", () => {
            const schema = z.object({
                query: z.string(),
                filters: z.object({
                    limit: z.number().optional(),
                    offset: z.number().optional(),
                }).optional(),
            });

            const tool = defineToolWithDescription(
                "search",
                "Search with optional filters",
                schema,
                async (args) => ({ results: [], total: 0, args })
            );

            expect(tool.definition.name).toBe("search");
            expect(tool.definition.description).toContain("optional filters");
        });
    });
});
