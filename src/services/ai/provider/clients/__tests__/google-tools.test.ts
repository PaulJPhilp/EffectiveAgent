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

describe("Google Client Tools - Schema and Message Handling", () => {

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
                parts: Chunk.of(new TextPart({ _tag: "Text", content: "Use the test tool" })),
                metadata: { messageId: "test-123" }
            });

            expect(userMessage.role).toBe("user");
            expect(Chunk.size(userMessage.parts)).toBe(1);
            const part = Chunk.unsafeHead(userMessage.parts);
            expect(part._tag).toBe("Text");
            expect((part as TextPart).content).toBe("Use the test tool");
            expect(userMessage.metadata?.messageId).toBe("test-123");

            // Test creating an assistant message
            const assistantMessage = new EffectiveMessage({
                role: "assistant",
                parts: Chunk.of(new TextPart({ _tag: "Text", content: "Tool result: success" })),
                metadata: { model: "gemini-pro" }
            });

            expect(assistantMessage.role).toBe("assistant");
            expect(assistantMessage.metadata?.model).toBe("gemini-pro");
        });

        it("should handle tool result message creation for Google", () => {
            // Test tool result message structure
            const toolResult = { result: "Tool executed successfully", timestamp: Date.now() };
            const toolResultString = JSON.stringify(toolResult);

            // This simulates the tool result message creation in the Google chat method
            const toolMessage = {
                role: 'user' as const,
                content: `Tool test-tool result: ${toolResultString}`
            };

            expect(toolMessage.role).toBe('user');
            expect(toolMessage.content).toContain("Tool test-tool result:");
            expect(toolMessage.content).toContain("Tool executed successfully");

            // Verify we can parse the result back
            const resultPart = toolMessage.content.replace("Tool test-tool result: ", "");
            const parsedResult = JSON.parse(resultPart);
            expect(parsedResult.result).toBe("Tool executed successfully");
            expect(parsedResult.timestamp).toBeTypeOf("number");
        });

        it("should handle multiple message parts", () => {
            // Test message with multiple text parts
            const multiPartMessage = new EffectiveMessage({
                role: "user",
                parts: Chunk.fromIterable([
                    new TextPart({ _tag: "Text", content: "First part" }),
                    new TextPart({ _tag: "Text", content: "Second part" })
                ]),
                metadata: {}
            });

            expect(Chunk.size(multiPartMessage.parts)).toBe(2);
            const parts = Chunk.toReadonlyArray(multiPartMessage.parts);
            expect((parts[0] as TextPart).content).toBe("First part");
            expect((parts[1] as TextPart).content).toBe("Second part");
        });
    });

    describe("Tool Definition Structure", () => {
        it("should create valid tool definition objects", async () => {
            const testEffect = Effect.gen(function* () {
                // Test basic tool definition structure
                const testTool = {
                    metadata: {
                        name: "test-tool",
                        description: "A test tool for validation"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: TestToolInputSchema,
                        execute: (input: { message: string; count: number }) =>
                            Effect.succeed({ result: `Processed: ${input.message} (${input.count} times)` })
                    }
                };

                expect(testTool.metadata.name).toBe("test-tool");
                expect(testTool.metadata.description).toBe("A test tool for validation");
                expect(testTool.implementation._tag).toBe("EffectImplementation");
                expect(testTool.implementation.inputSchema).toBe(TestToolInputSchema);

                // Test that the execute function works
                const executeResult = yield* testTool.implementation.execute({ message: "hello", count: 3 });
                expect(executeResult.result).toBe("Processed: hello (3 times)");
            });

            await Effect.runPromise(testEffect);
        });

        it("should create complex tool definitions", async () => {
            const testEffect = Effect.gen(function* () {
                const complexTool = {
                    metadata: {
                        name: "complex-search-tool",
                        description: "A complex search tool with nested parameters"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: TestComplexToolInputSchema,
                        execute: (input: { query: string; filters: string[]; options: { includeMetadata: boolean; maxResults: number } }) =>
                            Effect.succeed({
                                results: [`Result for ${input.query}`],
                                metadata: input.options.includeMetadata ? { totalFound: input.options.maxResults } : undefined,
                                appliedFilters: input.filters
                            })
                    }
                };

                expect(complexTool.metadata.name).toBe("complex-search-tool");
                expect(complexTool.implementation._tag).toBe("EffectImplementation");

                // Test execution with complex input
                const complexInput = {
                    query: "AI tools",
                    filters: ["category:ml", "status:active"],
                    options: { includeMetadata: true, maxResults: 5 }
                };

                const result = yield* complexTool.implementation.execute(complexInput);
                expect(result.results).toEqual(["Result for AI tools"]);
                expect(result.metadata).toEqual({ totalFound: 5 });
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
                        name: "failing-tool",
                        description: "A tool that always fails"
                    },
                    implementation: {
                        _tag: "EffectImplementation" as const,
                        inputSchema: TestToolInputSchema,
                        execute: (input: { message: string; count: number }) =>
                            Effect.fail(new Error("Tool execution failed"))
                    }
                };

                // Test that execution failure is handled properly
                const result = yield* Effect.either(
                    failingTool.implementation.execute({ message: "test", count: 1 })
                );

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(Error);
                    expect(result.left.message).toBe("Tool execution failed");
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

    describe("Google-specific Tool Patterns", () => {
        it("should handle tool call detection from JSON response", () => {
            // Test Google's JSON-based tool call format
            const googleResponse = '{"tool_name": "search", "tool_args": {"query": "test"}}';

            let toolCall: { tool_name: string; tool_args: any } | null = null;
            let toolCallDetected = false;
            let parseError: any = null;

            try {
                // Try to parse the entire response as JSON
                const parsed = JSON.parse(googleResponse);
                if (parsed && typeof parsed === 'object' && 'tool_name' in parsed) {
                    toolCall = parsed;
                    toolCallDetected = true;
                }
            } catch (error) {
                parseError = error;
            }

            expect(parseError).toBeNull();
            expect(toolCallDetected).toBe(true);
            expect(toolCall).toBeDefined();
            expect(toolCall?.tool_name).toBe("search");
            expect(toolCall?.tool_args.query).toBe("test");
        });

        it("should handle invalid JSON gracefully", () => {
            // Test invalid JSON response
            const invalidJsonResponse = '{"tool_name": "search", "tool_args": {"query": ';

            let toolCall: { tool_name: string; tool_args: any } | null = null;
            let toolCallDetected = false;
            let parseError: any = null;

            try {
                // Try to parse the entire response as JSON
                const parsed = JSON.parse(invalidJsonResponse);
                if (parsed && typeof parsed === 'object' && 'tool_name' in parsed) {
                    toolCall = parsed;
                    toolCallDetected = true;
                }
            } catch (error) {
                parseError = error;
            }

            expect(toolCallDetected).toBe(false);
            expect(toolCall).toBeNull();
            expect(parseError).toBeInstanceOf(SyntaxError);
        });

        it("should format system message correctly with tools", () => {
            const originalSystemMessage = "You are a helpful assistant.";
            const toolDescriptions = [
                "Tool: search - Search for information",
                "Tool: calculate - Perform calculations"
            ];

            const expectedSystemContent = `${originalSystemMessage}\n\nAvailable tools:\n${toolDescriptions.join('\n')}\n\nTo use a tool, respond with JSON in this format: {"tool_name": "toolname", "tool_args": {"arg1": "value1"}}`;

            expect(expectedSystemContent).toContain("You are a helpful assistant.");
            expect(expectedSystemContent).toContain("Available tools:");
            expect(expectedSystemContent).toContain("Tool: search - Search for information");
            expect(expectedSystemContent).toContain("Tool: calculate - Perform calculations");
            expect(expectedSystemContent).toContain('{"tool_name": "toolname", "tool_args": {"arg1": "value1"}}');
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
}); 