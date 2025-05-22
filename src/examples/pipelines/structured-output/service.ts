/**
 * @file Service implementation for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/service
 */


import type { LoggingServiceApi } from "@/services/core/logging/api.js";
import { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js";
import { Effect, Schema } from "effect";
import { GenerateStructuredOutputPayload, SchemaValidationError, SchemaValidatorToolApi, StructuredOutputPipelineApi, StructuredOutputPipelineError } from "./api.js";

/**
 * Converts a schema to a human-readable description
 */
const schemaToDescription = <A, I>(schema: Schema.Schema<A, I>): string => {
    return JSON.stringify(schema, null, 2);
};

/**
 * Helper function to generate LLM prompt for schema
 */
const generateSchemaPrompt = <A, I>(schema: Schema.Schema<A, I>): string => {
    const schemaDescription = schemaToDescription(schema);
    return `Generate a valid JSON object that conforms to the following schema:\n${schemaDescription}\n\nResponse must be valid JSON.`;
};

/**
 * Schema Validator Service implementation
 */
export class LocalSchemaValidatorService extends Effect.Service<SchemaValidatorToolApi>()(
    "LocalSchemaValidatorService",
    {
        effect: Effect.gen(function* () {
            return {
                validate: <I, A>(data: I, schema: Schema.Schema<A, I>): Effect.Effect<A, SchemaValidationError> =>
                    Effect.try({
                        try: () => {
                            // Decode using Schema.decode from effect
                            const result = Schema.decode(schema)(data);
                            return Effect.runSync(result);
                        },
                        catch: (error) => new SchemaValidationError({
                            message: "Schema validation failed.",
                            validationIssues: [String(error)]
                        })
                    })
            };
        }),
        dependencies: []
    }
) { }

/**
 * Implementation of the StructuredOutputPipeline using Effect.Service pattern.
 * This service provides methods for generating and extracting structured data using LLMs.
 */
export function makeStructuredOutputPipelineService(
    logger: LoggingServiceApi,
    objectService: ObjectServiceApi,
    schemaValidator: SchemaValidatorToolApi
): StructuredOutputPipelineApi {
    return {
        generateStructuredOutput: <A>(
            input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>,
            maxRetries = 3
        ): Effect.Effect<A, StructuredOutputPipelineError, never> =>
            Effect.gen(function* () {
                yield* logger.info("generateStructuredOutput called", { prompt: input.prompt });
                const result = yield* objectService.generate({
                    prompt: input.prompt,
                    schema: input.schema,
                    modelId: "gpt-4o"
                });
                yield* logger.info("Structured output generated", { data: JSON.stringify(result.data) });
                return result.data as A;
            }).pipe(
                Effect.catchAll((error) =>
                    Effect.fail(
                        error instanceof StructuredOutputPipelineError
                            ? error
                            : new StructuredOutputPipelineError({
                                message: "Unexpected error in generateStructuredOutput",
                                cause: error instanceof Error ? error : new Error(String(error)),
                            })
                    )
                )
            ) as Effect.Effect<A, StructuredOutputPipelineError, never>,
        extractStructured: <A>(
            text: string,
            schema: Schema.Schema<A, A>,
            options?: { maxRetries?: number; modelId?: string }
        ): Effect.Effect<A, StructuredOutputPipelineError, never> =>
            Effect.gen(function* () {
                yield* logger.info("extractStructured called", { text });
                const result = yield* objectService.generate({
                    prompt: `Extract structured data from this text: ${text}`,
                    schema: schema,
                    modelId: options?.modelId ?? "gpt-4o"
                });
                yield* logger.info("Structured data extracted", { data: JSON.stringify(result.data) });
                return result.data as A;
            }).pipe(
                Effect.catchAll((error) =>
                    Effect.gen(function* () {
                        yield* logger.error("extractStructured failed", { error: error instanceof Error ? error.stack ?? error.message : String(error) });
                        return yield* Effect.fail(
                            error instanceof StructuredOutputPipelineError
                                ? error
                                : new StructuredOutputPipelineError({
                                    message: "Unexpected error in extractStructured",
                                    cause: error instanceof Error ? error : new Error(String(error)),
                                })
                        );
                    })
                )
            ) as Effect.Effect<A, StructuredOutputPipelineError, never>,
    };
}

/**
 * Mock Schema Validator Service implementation for testing
 */
export class MockLocalSchemaValidatorService extends Effect.Service<SchemaValidatorToolApi>()(
    "MockLocalSchemaValidatorService",
    {
        effect: Effect.gen(function* () {
            return {
                validate: <I, A>(_data: I, _schema: Schema.Schema<A, I>): Effect.Effect<A, SchemaValidationError, never> =>
                    Effect.fail(new SchemaValidationError({
                        message: "Mock validation: Not implemented",
                        validationIssues: []
                    }))
            };
        }),
        dependencies: []
    }
) { }

/**
 * Mock Structured Output Pipeline Service implementation for testing
 */
export class MockStructuredOutputPipelineService extends Effect.Service<StructuredOutputPipelineApi>()(
    "MockStructuredOutputPipelineService",
    {
        effect: Effect.gen(function* () {
            return {
                generateStructuredOutput: <A>(
                    input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>,
                    maxRetries = 3
                ): Effect.Effect<A, StructuredOutputPipelineError> =>
                    Effect.succeed({} as A).pipe(
                        Effect.tap(() => Effect.logInfo("Mock generateStructuredOutput called"))
                    ),

                extractStructured: <A>(
                    text: string,
                    schema: Schema.Schema<A, A>,
                    maxRetries = 3
                ): Effect.Effect<A, StructuredOutputPipelineError> =>
                    Effect.succeed({} as A).pipe(
                        Effect.tap(() => Effect.logInfo("Mock extractStructured called"))
                    )
            };
        }),
        dependencies: []
    }
) { }