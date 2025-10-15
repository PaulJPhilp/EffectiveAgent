import { Message as EffectiveMessage, TextPart } from "@effective-agent/ai-sdk";
import { Chunk, Effect, Either, Schema as S } from "effect";
import { describe, expect, it } from "vitest";

// Test tool schemas
const TestToolInputSchema = S.Struct({
    message: S.String,
    count: S.Number
});

const TestComplexToolInputSchema = S.Struct({
    query: S.String,
    filters: S.Array(S.String),
    options: S.Struct({
        includeMetadata: S.Boolean,
        maxResults: S.Number
    })
});

describe("Anthropic Client Tools - Schema and Message Handling", () => {

    describe("Tool Schema Validation", () => {
        it("should validate tool input against Effect Schema", async () => {
            const testEffect = Effect.gen(function* () {
                // Test valid input structure
                const validInput = { message: "hello", count: 3 };
                const validationResult = yield* Effect.either(S.decode(TestToolInputSchema)(validInput));

                expect(Either.isRight(validationResult)).toBe(true);
                if (Either.isRight(validationResult)) {
                    expect(validationResult.right).toEqual(validInput);
                }

                // Test invalid input structure
                const invalidInput = { message: "hello", count: "invalid" };
                // @ts-expect-error - Testing invalid input types
                const invalidValidationResult = yield* Effect.either(S.decode(TestToolInputSchema)(invalidInput));

                expect(Either.isLeft(invalidValidationResult)).toBe(true);
            });

            await Effect.runPromise(testEffect);
        });

        it("should handle missing required fields in tool input", async () => {
            const testEffect = Effect.gen(function* () {
                // Test incomplete input
                const incompleteInput = { message: "hello" }; // missing 'count'
                // @ts-expect-error - Testing missing required field
                const validationResult = yield* Effect.either(S.decode(TestToolInputSchema)(incompleteInput));

                expect(Either.isLeft(validationResult)).toBe(true);
            });

            await Effect.runPromise(testEffect);
        });

        it("should validate complex nested schemas", async () => {
            const testEffect = Effect.gen(function* () {
                const validComplexInput = {
                    query: "search term",
                    filters: ["tag1", "tag2"],
                    options: {
                        includeMetadata: true,
                        maxResults: 10
                    }
                };

                const validationResult = yield* Effect.either(S.decode(TestComplexToolInputSchema)(validComplexInput));

                expect(Either.isRight(validationResult)).toBe(true);
                if (Either.isRight(validationResult)) {
                    expect(validationResult.right).toEqual(validComplexInput);
                }

                // Test invalid nested structure
                const invalidComplexInput = {
                    query: "search term",
                    filters: ["tag1", "tag2"],
                    options: {
                        includeMetadata: "not_boolean", // should be boolean
                        maxResults: 10
                    }
                };
                // @ts-expect-error - Testing invalid boolean type
                const invalidValidationResult = yield* Effect.either(S.decode(TestComplexToolInputSchema)(invalidComplexInput));

                expect(Either.isLeft(invalidValidationResult)).toBe(true);
            });

            await Effect.runPromise(testEffect);
        });
    });

    describe("Message Mapping Functions", () => {
        it("should create EffectiveMessage objects correctly", () => {
            // Test creating a basic user message
            const userMessage = new EffectiveMessage({
                role: "user",
                parts: Chunk.of(new TextPart({ _tag: "Text", content: "Use the test tool with Claude" })),
                metadata: { messageId: "test-123" }
            });

            expect(userMessage.role).toBe("user");
            expect(Chunk.size(userMessage.parts)).toBe(1);
            const part = Chunk.unsafeHead(userMessage.parts);
            expect(part._tag).toBe("Text");
            expect((part as TextPart).content).toBe("Use the test tool with Claude");
            expect(userMessage.metadata?.messageId).toBe("test-123");

            // Test creating an assistant message
            const assistantMessage = new EffectiveMessage({
                role: "assistant",
                parts: Chunk.of(new TextPart({ _tag: "Text", content: "Tool result: Claude processed successfully" })),
                metadata: { model: "claude-3-5-sonnet-20241022" }
            });

            expect(assistantMessage.role).toBe("assistant");
            expect(assistantMessage.metadata?.model).toBe("claude-3-5-sonnet-20241022");
        });

        it("should handle tool result message creation", () => {
            // Test tool result message structure for Anthropic
            const toolResult = { result: "Tool executed successfully by Claude", timestamp: Date.now() };
            const toolResultString = JSON.stringify(toolResult);

            // This simulates the tool result message creation in the chat method
            const toolMessage = {
                role: 'tool' as const,
                content: toolResultString,
                toolCallId: "anthropic-call-123"
            };

            expect(toolMessage.role).toBe('tool');
            expect(toolMessage.content).toContain("Tool executed successfully by Claude");
            expect(toolMessage.toolCallId).toBe("anthropic-call-123");

            // Verify we can parse the result back
            const parsedResult = JSON.parse(toolMessage.content);
            expect(parsedResult.result).toBe("Tool executed successfully by Claude");
            expect(parsedResult.timestamp).toBeTypeOf("number");
        });

        it("should handle multiple message parts", () => {
            // Test message with multiple text parts
            const multiPartMessage = new EffectiveMessage({
                role: "user",
                parts: Chunk.fromIterable([
                    new TextPart({ _tag: "Text", content: "First part for Claude" }),
                    new TextPart({ _tag: "Text", content: "Second part for Claude" })
                ]),
                metadata: {}
            });

            expect(Chunk.size(multiPartMessage.parts)).toBe(2);
            const parts = Chunk.toReadonlyArray(multiPartMessage.parts);
            expect((parts[0] as TextPart).content).toBe("First part for Claude");
            expect((parts[1] as TextPart).content).toBe("Second part for Claude");
        });
    });

    describe("Tool Definition Structure", () => {
        it("should create valid tool definition objects for Anthropic", async () => {
            const testEffect = Effect.gen(function* () {
                // Test basic tool definition structure
                const testTool = {
                    metadata: {
                        name: "anthropic-test-tool",
                        description: "A test tool for Anthropic Claude validation"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: TestToolInputSchema,
                        execute: (input: { message: string; count: number }) =>
                            Effect.succeed({ result: `Claude processed: ${input.message} (${input.count} times)` })
                    }
                };

                expect(testTool.metadata.name).toBe("anthropic-test-tool");
                expect(testTool.metadata.description).toBe("A test tool for Anthropic Claude validation");
                expect(testTool.implementation._tag).toBe("EffectImplementation");
                expect(testTool.implementation.inputSchema).toBe(TestToolInputSchema);

                // Test that the execute function works
                const executeResult = yield* testTool.implementation.execute({ message: "hello", count: 3 });
                expect(executeResult.result).toBe("Claude processed: hello (3 times)");
            });

            await Effect.runPromise(testEffect);
        });

        it("should create complex tool definitions for Anthropic", async () => {
            const testEffect = Effect.gen(function* () {
                const complexTool = {
                    metadata: {
                        name: "claude-search-tool",
                        description: "A complex search tool optimized for Claude with nested parameters"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: TestComplexToolInputSchema,
                        execute: (input: { query: string; filters: string[]; options: { includeMetadata: boolean; maxResults: number } }) =>
                            Effect.succeed({
                                results: [`Claude result for ${input.query}`],
                                metadata: input.options.includeMetadata ? { totalFound: input.options.maxResults, model: "claude-3-5-sonnet" } : undefined,
                                appliedFilters: input.filters
                            })
                    }
                };

                expect(complexTool.metadata.name).toBe("claude-search-tool");
                expect(complexTool.implementation._tag).toBe("EffectImplementation");

                // Test execution with complex input
                const complexInput = {
                    query: "AI tools for Claude",
                    filters: ["category:ml", "status:active"],
                    options: { includeMetadata: true, maxResults: 5 }
                };

                const result = yield* complexTool.implementation.execute(complexInput);
                expect(result.results).toEqual(["Claude result for AI tools for Claude"]);
                expect(result.metadata).toEqual({ totalFound: 5, model: "claude-3-5-sonnet" });
                expect(result.appliedFilters).toEqual(["category:ml", "status:active"]);
            });

            await Effect.runPromise(testEffect);
        });
    });

    describe("Error Handling", () => {
        it("should handle tool execution errors gracefully", async () => {
            const testEffect = Effect.gen(function* () {
                // Create a tool that always fails
                const failingTool = {
                    metadata: {
                        name: "anthropic-failing-tool",
                        description: "A tool that always fails for Claude"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: TestToolInputSchema,
                        execute: (_input: { message: string; count: number }) =>
                            Effect.fail(new Error("Claude tool execution failed"))
                    }
                };

                // Test that execution failure is handled properly
                const result = yield* Effect.either(
                    failingTool.implementation.execute({ message: "test", count: 1 })
                );

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(Error);
                    expect(result.left.message).toBe("Claude tool execution failed");
                }
            });

            await Effect.runPromise(testEffect);
        });

        it("should handle invalid tool input gracefully", async () => {
            const testEffect = Effect.gen(function* () {
                // Test with invalid input that doesn't match schema
                const invalidInput = { message: 123, count: "invalid" }; // types are wrong
                // @ts-expect-error - Testing completely wrong types
                const validationResult = yield* Effect.either(S.decode(TestToolInputSchema)(invalidInput));

                expect(Either.isLeft(validationResult)).toBe(true);
                if (Either.isLeft(validationResult)) {
                    // Should be a ParseError from Effect Schema
                    expect(validationResult.left).toBeDefined();
                }
            });

            await Effect.runPromise(testEffect);
        });
    });

    describe("Schema Conversion Edge Cases", () => {
        it("should handle empty arrays in schema", async () => {
            const testEffect = Effect.gen(function* () {
                const inputWithEmptyArray = {
                    query: "test",
                    filters: [], // empty array
                    options: { includeMetadata: false, maxResults: 0 }
                };

                const result = yield* Effect.either(S.decode(TestComplexToolInputSchema)(inputWithEmptyArray));
                expect(Either.isRight(result)).toBe(true);
                if (Either.isRight(result)) {
                    expect(result.right.filters).toEqual([]);
                }
            });

            await Effect.runPromise(testEffect);
        });

        it("should handle edge case values in schema", async () => {
            const testEffect = Effect.gen(function* () {
                // Test with edge case values
                const edgeCaseInput = {
                    message: "", // empty string
                    count: 0 // zero
                };

                const result = yield* Effect.either(S.decode(TestToolInputSchema)(edgeCaseInput));
                expect(Either.isRight(result)).toBe(true);
                if (Either.isRight(result)) {
                    expect(result.right.message).toBe("");
                    expect(result.right.count).toBe(0);
                }
            });

            await Effect.runPromise(testEffect);
        });

        it("should reject null and undefined values", async () => {
            const testEffect = Effect.gen(function* () {
                // Test null values
                const nullInput = { message: null, count: 5 };
                // @ts-expect-error - Testing null value handling
                const nullResult = yield* Effect.either(S.decode(TestToolInputSchema)(nullInput));
                expect(Either.isLeft(nullResult)).toBe(true);

                // Test undefined values  
                const undefinedInput = { message: "test", count: undefined };
                // @ts-expect-error - Testing undefined value handling
                const undefinedResult = yield* Effect.either(S.decode(TestToolInputSchema)(undefinedInput));
                expect(Either.isLeft(undefinedResult)).toBe(true);
            });

            await Effect.runPromise(testEffect);
        });
    });

    describe("Anthropic-Specific Tool Features", () => {
        it("should handle Claude-specific tool call format", () => {
            // Test Anthropic's tool call response format
            const claudeToolResponse = {
                tool_name: "search",
                tool_args: { query: "test query for Claude" },
                tool_call_id: "claude_call_123"
            };

            expect(claudeToolResponse.tool_name).toBe("search");
            expect(claudeToolResponse.tool_args.query).toBe("test query for Claude");
            expect(claudeToolResponse.tool_call_id).toBe("claude_call_123");

            // Verify JSON serialization works
            const serialized = JSON.stringify(claudeToolResponse);
            const deserialized = JSON.parse(serialized);
            expect(deserialized.tool_name).toBe("search");
        });

        it("should handle Claude-specific error responses", () => {
            // Test error format specific to Anthropic/Claude
            const claudeError = {
                type: "error",
                error: {
                    type: "invalid_request_error",
                    message: "Tool execution failed in Claude"
                }
            };

            expect(claudeError.type).toBe("error");
            expect(claudeError.error.message).toBe("Tool execution failed in Claude");
        });
    });
}); 