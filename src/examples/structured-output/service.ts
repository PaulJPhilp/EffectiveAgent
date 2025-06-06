/**
 * @file Service implementations for structured output pipeline
 * @module examples/structured-output/service
 */

import { Effect, Schema } from "effect";
import type { SchemaValidatorToolApi, StructuredOutputPipelineApi } from "./api.js";
import { StructuredOutputPipelineError } from "./errors.js";

// Mock implementation of LocalSchemaValidatorService
export class LocalSchemaValidatorService extends Effect.Service<SchemaValidatorToolApi>()("LocalSchemaValidatorService", {
    effect: Effect.succeed({
        validateSchema: <T>(data: unknown, schema: Schema.Schema<T, any>) =>
            Effect.try({
                try: () => Schema.decodeUnknownSync(schema)(data),
                catch: (error) => new StructuredOutputPipelineError({
                    message: `Schema validation failed: ${error}`,
                    cause: error
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
        validateSchema: <T>(data: unknown, schema: Schema.Schema<T, any>) =>
            Effect.succeed(data as T)
    }),
    dependencies: []
}) { }

// Factory function for creating the service
export function makeStructuredOutputPipelineService(
    objectService: any,
    schemaValidator: any
): StructuredOutputPipelineApi {
    return {
        generateStructuredOutput: <T>(payload: { prompt: string; schema: Schema.Schema<T, any> }) =>
            Effect.succeed({
                name: "Generated Person",
                age: 35
            } as T),

        extractStructured: <T>(text: string, schema: Schema.Schema<T, any>) =>
            Effect.succeed({
                name: "Extracted Person",
                age: 40
            } as T)
    };
} 