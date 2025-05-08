import { createTypedMock } from "@/services/core/test-harness/utils/typed-mocks.js";
import { ObjectGenerationError } from "@/services/pipeline/producers/object/errors.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { Context, Effect, Either, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { StructuredOutputPipeline } from "../structured-output.js";

class Person extends Schema.Class<Person>("Person")({
    name: Schema.String,
    age: Schema.Number,
    email: Schema.optional(Schema.String)
}) { }

describe("StructuredOutputPipeline", () => {
    // Mock object service
    const mockObjectService = createTypedMock<ObjectService>({
        generate: <T>() => Effect.succeed({
            data: {
                name: "John Doe",
                age: 30,
                email: "john@example.com"
            } as T,
            model: "test-model",
            timestamp: new Date(),
            id: "test-id",
            usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30
            }
        })
    });

    // Test context
    const testContext = Context.empty().pipe(
        Context.add(ObjectService, mockObjectService)
    );

    it("should generate structured output successfully", async () => {
        const pipeline = new StructuredOutputPipeline<Person>(Person);
        const result = await Effect.runPromise(pipeline.run({
            prompt: "Generate a person object",
            modelId: "test-model",
            systemPrompt: "You are an AI assistant that generates structured data."
        }).pipe(Effect.provide(testContext)));

        expect(result.data.name).toBe("John Doe");
        expect(result.data.age).toBe(30);
        expect(result.data.email).toBe("john@example.com");
        expect(result.usage.totalTokens).toBe(30);
    });

    it("should handle missing optional fields", async () => {
        // Override mock to return data without email
        const mockServiceNoEmail = createTypedMock<ObjectService>({
            generate: <T>() => Effect.succeed({
                data: {
                    name: "Jane Doe",
                    age: 25
                } as T,
                model: "test-model",
                timestamp: new Date(),
                id: "test-id",
                usage: {
                    promptTokens: 8,
                    completionTokens: 15,
                    totalTokens: 23
                }
            })
        });

        const contextNoEmail = Context.empty().pipe(
            Context.add(ObjectService, mockServiceNoEmail)
        );

        const pipeline = new StructuredOutputPipeline<Person>(Person);
        const result = await Effect.runPromise(pipeline.run({
            prompt: "Generate a person object without email",
            modelId: "test-model"
        }).pipe(Effect.provide(contextNoEmail)));

        expect(result.data.name).toBe("Jane Doe");
        expect(result.data.age).toBe(25);
        expect(result.data.email).toBeUndefined();
        expect(result.usage.totalTokens).toBe(23);
    });

    it("should handle validation errors", async () => {
        // Override mock to return invalid data
        const mockServiceInvalid = createTypedMock<ObjectService>({
            generate: () => Effect.fail(new ObjectGenerationError({
                description: "Schema validation failed",
                module: "test",
                method: "generate",
                cause: new Error("Invalid data")
            }))
        });

        const contextInvalid = Context.empty().pipe(
            Context.add(ObjectService, mockServiceInvalid)
        );

        const pipeline = new StructuredOutputPipeline<Person>(Person);
        const result = await Effect.runPromise(Effect.either(pipeline.run({
            prompt: "Generate an invalid person object",
            modelId: "test-model"
        }).pipe(Effect.provide(contextInvalid))));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
            expect(result.left.message).toContain("Schema validation failed");
        }
    });
});