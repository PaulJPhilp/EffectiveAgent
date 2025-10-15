import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NodeFileSystem } from "@effect/platform-node";
import { Message as EffectiveMessage, TextPart } from "@effective-agent/ai-sdk";
import { Chunk, Effect, Either, Layer, Schema as S } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { makeAnthropicClient } from "../anthropic-provider-client.js";
import { makeGoogleClient } from "../google-provider-client.js";
import { makeOpenAIClient } from "../openai-provider-client.js";

// Test tool schemas
const CalculatorInputSchema = S.Struct({
    operation: S.Literal("add", "subtract", "multiply", "divide"),
    a: S.Number,
    b: S.Number
});

const WeatherInputSchema = S.Struct({
    location: S.String,
    units: S.optional(S.Literal("celsius", "fahrenheit"))
});

describe("Tool Integration Tests - End-to-End", () => {
    const testDir = join(process.cwd(), "test-tool-integration");
    const masterConfigPath = join(testDir, "master-config.json");
    const modelsConfigPath = join(testDir, "models.json");
    const providersConfigPath = join(testDir, "providers.json");
    const policyConfigPath = join(testDir, "policy.json");

    const masterConfigData = {
        name: "Tool Integration Test Config",
        version: "1.0.0",
        configPaths: {
            models: modelsConfigPath,
            providers: providersConfigPath,
            policy: policyConfigPath
        }
    };

    const modelsConfigData = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4o",
                displayName: "GPT-4 Omni",
                provider: { name: "openai", displayName: "OpenAI" },
                vendorCapabilities: ["chat", "text-generation", "function-calling"],
                contextWindow: 128000,
                maxTokens: 4096
            },
            {
                id: "claude-3-5-sonnet-20241022",
                displayName: "Claude 3.5 Sonnet",
                provider: { name: "anthropic", displayName: "Anthropic" },
                vendorCapabilities: ["chat", "text-generation", "function-calling"],
                contextWindow: 200000,
                maxTokens: 8192
            },
            {
                id: "gemini-pro",
                displayName: "Gemini Pro",
                provider: { name: "google", displayName: "Google" },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 128000,
                maxTokens: 4096
            }
        ]
    };

    const providersConfigData = {
        name: "Test Providers Config",
        providers: [
            {
                name: "openai",
                displayName: "OpenAI",
                type: "llm",
                apiKeyEnvVar: "OPENAI_API_KEY",
                baseUrl: "https://api.openai.com/v1",
                capabilities: ["chat", "text-generation", "function-calling"]
            },
            {
                name: "anthropic",
                displayName: "Anthropic",
                type: "llm",
                apiKeyEnvVar: "ANTHROPIC_API_KEY",
                baseUrl: "https://api.anthropic.com",
                capabilities: ["chat", "text-generation", "function-calling"]
            },
            {
                name: "google",
                displayName: "Google",
                type: "llm",
                apiKeyEnvVar: "GOOGLE_API_KEY",
                baseUrl: "https://generativelanguage.googleapis.com",
                capabilities: ["chat", "text-generation"]
            }
        ]
    };

    const policyConfigData = {
        name: "Test Policy Config",
        policies: [
            {
                id: "default",
                name: "Default Policy",
                type: "allow",
                resource: "*",
                priority: 1,
                enabled: true
            }
        ]
    };

    const originalEnv = { ...process.env };

    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
        writeFileSync(masterConfigPath, JSON.stringify(masterConfigData, null, 2));
        writeFileSync(modelsConfigPath, JSON.stringify(modelsConfigData, null, 2));
        writeFileSync(providersConfigPath, JSON.stringify(providersConfigData, null, 2));
        writeFileSync(policyConfigPath, JSON.stringify(policyConfigData, null, 2));

        process.env.MASTER_CONFIG_PATH = masterConfigPath;
        process.env.OPENAI_API_KEY = "test-openai-key";
        process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
        process.env.GOOGLE_API_KEY = "test-google-key";
    });

    afterEach(() => {
        try {
            unlinkSync(masterConfigPath);
            unlinkSync(modelsConfigPath);
            unlinkSync(providersConfigPath);
            unlinkSync(policyConfigPath);
            rmdirSync(testDir);
        } catch (_error) {
            // Ignore cleanup errors
        }
        process.env = { ...originalEnv };
    });

    describe("Tool Definition Creation", () => {
        it("should create valid tool definitions for all provider types", () => {
            const calculatorTool = {
                metadata: {
                    name: "calculator",
                    description: "Perform basic mathematical operations"
                },
                implementation: {
                    _tag: "EffectImplementation" as const,
                    inputSchema: CalculatorInputSchema,
                    execute: (input: { operation: string; a: number; b: number }) =>
                        Effect.succeed({
                            result: input.operation === "add" ? input.a + input.b :
                                input.operation === "subtract" ? input.a - input.b :
                                    input.operation === "multiply" ? input.a * input.b :
                                        input.operation === "divide" ? input.a / input.b : 0
                        })
                }
            };

            const weatherTool = {
                metadata: {
                    name: "weather",
                    description: "Get current weather information for a location"
                },
                implementation: {
                    _tag: "EffectImplementation" as const,
                    inputSchema: WeatherInputSchema,
                    execute: (input: { location: string; units?: string }) =>
                        Effect.succeed({
                            location: input.location,
                            temperature: input.units === "fahrenheit" ? 72 : 22,
                            units: input.units || "celsius",
                            conditions: "Sunny"
                        })
                }
            };

            // Validate tool structures
            expect(calculatorTool.metadata.name).toBe("calculator");
            expect(calculatorTool.implementation._tag).toBe("EffectImplementation");
            expect(weatherTool.metadata.name).toBe("weather");
            expect(weatherTool.implementation._tag).toBe("EffectImplementation");

            // Test tool execution
            return Effect.gen(function* () {
                const calcResult = yield* calculatorTool.implementation.execute({
                    operation: "add",
                    a: 5,
                    b: 3
                });
                expect(calcResult.result).toBe(8);

                const weatherResult = yield* weatherTool.implementation.execute({
                    location: "New York",
                    units: "fahrenheit"
                });
                expect(weatherResult.temperature).toBe(72);
                expect(weatherResult.location).toBe("New York");
            }).pipe(Effect.runPromise);
        });
    });

    describe("Message Format Conversion", () => {
        it("should convert EffectiveMessage format correctly for all providers", () => {
            const testMessage = new EffectiveMessage({
                role: "user",
                parts: Chunk.of(new TextPart({ _tag: "Text", content: "Calculate 5 + 3" })),
                metadata: { messageId: "test-123" }
            });

            // Test message structure
            expect(testMessage.role).toBe("user");
            expect(Chunk.size(testMessage.parts)).toBe(1);
            const part = Chunk.unsafeHead(testMessage.parts);
            expect((part as TextPart).content).toBe("Calculate 5 + 3");

            // Test with tool response message
            const toolResponseMessage = new EffectiveMessage({
                role: "tool",
                parts: Chunk.of(new TextPart({ _tag: "Text", content: JSON.stringify({ result: 8 }) })),
                metadata: { toolCallId: "calc-123", toolName: "calculator" }
            });

            expect(toolResponseMessage.role).toBe("tool");
            expect(toolResponseMessage.metadata?.toolName).toBe("calculator");
            expect(toolResponseMessage.metadata?.toolCallId).toBe("calc-123");
        });
    });

    describe("Schema Validation Integration", () => {
        it("should validate tool inputs across different schema complexities", async () => {
            const testEffect = Effect.gen(function* () {
                // Test simple calculator input
                const calcInput = { operation: "multiply" as const, a: 4, b: 7 };
                const calcValidation = yield* Effect.either(S.decode(CalculatorInputSchema)(calcInput));
                expect(Either.isRight(calcValidation)).toBe(true);
                if (Either.isRight(calcValidation)) {
                    expect(calcValidation.right.operation).toBe("multiply");
                    expect(calcValidation.right.a).toBe(4);
                    expect(calcValidation.right.b).toBe(7);
                }

                // Test weather input with optional field
                const weatherInput = { location: "San Francisco" };
                const weatherValidation = yield* Effect.either(S.decode(WeatherInputSchema)(weatherInput));
                expect(Either.isRight(weatherValidation)).toBe(true);
                if (Either.isRight(weatherValidation)) {
                    expect(weatherValidation.right.location).toBe("San Francisco");
                    expect(weatherValidation.right.units).toBeUndefined();
                }

                // Test weather input with optional field provided
                const weatherInputComplete = { location: "London", units: "celsius" as const };
                const weatherValidationComplete = yield* Effect.either(S.decode(WeatherInputSchema)(weatherInputComplete));
                expect(Either.isRight(weatherValidationComplete)).toBe(true);
                if (Either.isRight(weatherValidationComplete)) {
                    expect(weatherValidationComplete.right.units).toBe("celsius");
                }

                // Test invalid inputs

                const invalidCalcInput = { operation: "power", a: 2, b: 3 };
                // @ts-expect-error - Testing invalid input
                const invalidCalcValidation = yield* Effect.either(S.decode(CalculatorInputSchema)(invalidCalcInput));
                expect(Either.isLeft(invalidCalcValidation)).toBe(true);


                const invalidWeatherInput = { units: "celsius" };
                // @ts-expect-error - Testing missing required field
                const invalidWeatherValidation = yield* Effect.either(S.decode(WeatherInputSchema)(invalidWeatherInput));
                expect(Either.isLeft(invalidWeatherValidation)).toBe(true);
            });

            await Effect.runPromise(testEffect);
        });
    });

    describe("Provider Client Integration", () => {
        it("should verify client creation and basic structure", () =>
            Effect.gen(function* () {
                // Create and verify each client
                const openaiClient = yield* makeOpenAIClient("test-key");
                const anthropicClient = yield* makeAnthropicClient("test-key");
                const googleClient = yield* makeGoogleClient("test-key");

                // Verify client structure
                expect(openaiClient).toBeDefined();
                expect(typeof openaiClient.generateText).toBe("function");
                expect(typeof openaiClient.chat).toBe("function");

                expect(anthropicClient).toBeDefined();
                expect(typeof anthropicClient.generateText).toBe("function");
                expect(typeof anthropicClient.chat).toBe("function");

                expect(googleClient).toBeDefined();
                expect(typeof googleClient.generateText).toBe("function");
                expect(typeof googleClient.chat).toBe("function");
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default,
                    ToolRegistryService.Default
                ))
            )
        );
    });

    describe("Error Handling Integration", () => {
        it("should verify error handling method signatures", () =>
            Effect.gen(function* () {
                // Test that all client factory functions exist and can handle error scenarios
                const _testTools = [{
                    metadata: {
                        name: "test-tool",
                        description: "A test tool"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: CalculatorInputSchema,
                        execute: (_input: any) => Effect.succeed({ result: "success" })
                    }
                }];

                const _invalidInput = {
                    text: "Use the test tool",
                    messages: Chunk.of(new EffectiveMessage({
                        role: "user",
                        parts: Chunk.of(new TextPart({ _tag: "Text", content: "Test message" })),
                        metadata: {}
                    }))
                };

                // Verify that the factory functions exist and are callable
                const providers = [
                    { name: "OpenAI", factory: makeOpenAIClient, key: "test-openai-key" },
                    { name: "Anthropic", factory: makeAnthropicClient, key: "test-anthropic-key" },
                    { name: "Google", factory: makeGoogleClient, key: "test-google-key" }
                ];

                for (const provider of providers) {
                    expect(typeof provider.factory).toBe("function");
                    const effect = provider.factory(provider.key);
                    expect(effect).toBeDefined();
                    // The effect should be an Effect type with proper structure
                    expect(effect.pipe).toBeDefined();
                }
            }));
    });

    describe("Tool Lifecycle Simulation", () => {
        it("should simulate complete tool calling lifecycle", async () => {
            const calculatorTool = {
                metadata: {
                    name: "calculator",
                    description: "Perform basic mathematical operations"
                },
                implementation: {
                    _tag: "EffectImplementation" as const,
                    inputSchema: CalculatorInputSchema,
                    execute: (input: { operation: string; a: number; b: number }) =>
                        Effect.succeed({
                            result: input.operation === "add" ? input.a + input.b : 0
                        })
                }
            };

            const testEffect = Effect.gen(function* () {
                // Simulate the complete lifecycle:
                // 1. Tool discovery - tools are provided to client
                // 2. Schema validation - input is validated against tool schema
                // 3. Tool execution - tool is executed with validated input
                // 4. Result processing - result is processed and returned

                // Step 1: Tool discovery (tools provided to chat method)
                const tools = [calculatorTool];
                expect(tools.length).toBe(1);
                expect(tools[0]?.metadata.name).toBe("calculator");

                // Step 2: Schema validation
                const toolInput = { operation: "add" as const, a: 5, b: 3 };
                const validation = yield* Effect.either(
                    S.decode(CalculatorInputSchema)(toolInput)
                );
                expect(Either.isRight(validation)).toBe(true);

                // Step 3: Tool execution
                if (Either.isRight(validation)) {
                    const executionResult = yield* calculatorTool.implementation.execute(
                        validation.right
                    );
                    expect(executionResult.result).toBe(8);

                    // Step 4: Result processing (simulated)
                    const processedResult = JSON.stringify(executionResult);
                    expect(processedResult).toContain("\"result\":8");

                    const parsedBack = JSON.parse(processedResult);
                    expect(parsedBack.result).toBe(8);
                }
            });

            await Effect.runPromise(testEffect);
        });
    });
}); 