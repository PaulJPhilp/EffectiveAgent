/**
 * @file Service implementations for structured output pipeline
 * @module examples/structured-output/service
 */

import { Effect, Schema } from "effect";
import type { ObjectServiceApi } from "@/services/producers/object/api.js";
import type { ObjectGenerationOptions } from "@/services/producers/object/types.js";
import type { GenerateStructuredOutputPayload, SchemaValidatorToolApi, StructuredOutputPipelineApi } from "./api.js";
import { SchemaValidationError, StructuredOutputPipelineError } from "./api.js";

// Mock implementation of LocalSchemaValidatorService
export class LocalSchemaValidatorService extends Effect.Service<SchemaValidatorToolApi>()("LocalSchemaValidatorService", {
    effect: Effect.succeed({
        validate: <A>(data: unknown, schema: Schema.Schema<A, unknown>) =>
            Effect.try({
                try: () => Schema.decodeUnknownSync(schema)(data),
                catch: (error) => new SchemaValidationError({
                    message: `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
                    validationIssues: [error instanceof Error ? error.message : String(error)]
                })
            })
    }),
    dependencies: []
}) { }

// Mock implementation of StructuredOutputPipelineService
export class MockStructuredOutputPipelineService extends Effect.Service<StructuredOutputPipelineApi>()("MockStructuredOutputPipelineService", {
    effect: Effect.succeed({
        generateStructuredOutput: <T>(payload: { prompt: string; schema: Schema.Schema<T, any> }) =>
            Effect.succeed({
                name: "Mock Person",
                age: 25
            } as T),

        extractStructured: <T>(text: string, schema: Schema.Schema<T, any>) =>
            Effect.succeed({
                name: "Extracted Person",
                age: 30
            } as T)
    }),
    dependencies: []
}) { }

// Mock implementation of LocalSchemaValidatorService for testing
export class MockLocalSchemaValidatorService extends Effect.Service<SchemaValidatorToolApi>()("MockLocalSchemaValidatorService", {
    effect: Effect.succeed({
        validate: <A>(data: unknown, schema: Schema.Schema<A, unknown>) =>
            Effect.succeed(data as A)
    }),
    dependencies: []
}) { }

// Factory function for creating the service
export function makeStructuredOutputPipelineService(
    objectService: ObjectServiceApi,
    schemaValidator: SchemaValidatorToolApi
): StructuredOutputPipelineApi {
    return {
        generateStructuredOutput: <A>(
            input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>,
            maxRetries?: number
        ) =>
            Effect.gen(function* () {
                const options: ObjectGenerationOptions<Schema.Schema<A, A>> = {
                    prompt: input.prompt,
                    schema: input.schema,
                    modelId: input.modelId
                };

                const response = yield* objectService.generate(options);
                const validatedData = yield* schemaValidator.validate(response.data as unknown, input.schema as unknown as Schema.Schema<A, unknown>);

                return validatedData;
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof SchemaValidationError) {
                        return new StructuredOutputPipelineError({
                            message: `Structured output generation failed: ${error.message}`,
                            cause: error
                        });
                    }
                    return new StructuredOutputPipelineError({
                        message: "Structured output generation failed",
                        cause: error
                    });
                })
            ),

        extractStructured: <A>(
            text: string,
            schema: Schema.Schema<A, A>,
            options?: { maxRetries?: number; modelId?: string }
        ) =>
            Effect.gen(function* () {
                const prompt = `Extract structured information from the following text according to the schema.\n\nText: ${text}`;
                const generationOptions: ObjectGenerationOptions<Schema.Schema<A, A>> = {
                    prompt,
                    schema,
                    modelId: options?.modelId
                };

                const response = yield* objectService.generate(generationOptions);
                const validatedData = yield* schemaValidator.validate(response.data as unknown, schema as unknown as Schema.Schema<A, unknown>);

                return validatedData;
            }).pipe(
                Effect.mapError((error) => {
                    if (error instanceof SchemaValidationError) {
                        return new StructuredOutputPipelineError({
                            message: `Structured extraction failed: ${error.message}`,
                            cause: error
                        });
                    }
                    return new StructuredOutputPipelineError({
                        message: "Structured extraction failed",
                        cause: error
                    });
                })
            )
    };
} 