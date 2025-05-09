/**
 * @file Service implementation for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/service
 */

import * as S from "@effect/schema/Schema";
import { Effect, Layer, pipe } from "effect";
import {
    type GenerateStructuredOutputPayload,
    StructuredOutputPipelineApi,
    StructuredOutputPipelineError
} from "./api.js";
import { CacheService } from "./cache.js";

/**
 * Service for schema validation
 */
export interface SchemaValidatorToolApi {
    readonly validate: <T>(data: unknown, schema: S.Schema<T>) => Effect.Effect<T, SchemaValidationError>;
}

/**
 * Schema validator service implementation
 */
export class SchemaValidatorTool extends Effect.Service<SchemaValidatorToolApi>()(
    "SchemaValidatorTool",
    {
        effect: Effect.succeed({
            validate: <T>(data: unknown, schema: S.Schema<T>) =>
                Effect.fail(new SchemaValidationError({
                    message: "Not implemented",
                    validationIssues: []
                }))
        }),
        dependencies: []
    }
) { }

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends StructuredOutputPipelineError {
    readonly validationIssues: string[];

    constructor(params: { message: string; validationIssues: string[]; cause?: unknown }) {
        super({
            message: `Schema validation failed: ${params.message}`,
            cause: params.cause,
        });
        this.validationIssues = params.validationIssues;
    }
}

/**
 * Converts a schema to a human-readable description
 */
const schemaToDescription = <T>(schema: S.Schema<T>): string => {
    return JSON.stringify(schema, null, 2);
};

/**
 * StructuredOutputPipeline service implementation
 */
export class StructuredOutputPipeline extends Effect.Service<StructuredOutputPipelineApi>()(
    "StructuredOutputPipeline",
    {
        effect: pipe(
            Effect.all({
                schemaValidator: SchemaValidatorTool,
                cache: CacheService
            }),
            Effect.map(({ schemaValidator, cache }) => ({
                generateStructuredOutput: <T>(
                    input: GenerateStructuredOutputPayload<S.Schema<T>>,
                    maxRetries: number = 3
                ): Effect.Effect<T, StructuredOutputPipelineError> =>
                    Effect.gen(function* () {
                        yield* Effect.logInfo(`Generating structured output for prompt: ${input.prompt.substring(0, 50)}...`);

                        const cacheKey = yield* cache.generateKey(input.prompt, input.schema);
                        const cachedResult = yield* cache.get(cacheKey);

                        if (cachedResult) {
                            yield* Effect.logInfo("Returning cached result");
                            return cachedResult as T;
                        }

                        let currentTry = 0;
                        let lastError: unknown;
                        let formattedPrompt = input.prompt;

                        formattedPrompt += `\n\nPlease provide output in the following format:\n${schemaToDescription(input.schema)}`;

                        if (input.examples?.length) {
                            formattedPrompt += "\n\nHere are some examples:\n" + input.examples
                                .map((ex: { input: string; output: unknown }) =>
                                    `Input: ${ex.input}\nOutput: ${JSON.stringify(ex.output, null, 2)}`)
                                .join("\n\n");
                        }

                        while (currentTry < maxRetries) {
                            currentTry++;

                            const result = yield* pipe(
                                Effect.all([
                                    generateMockOutput(input.schema),
                                    Effect.succeed(input.schema)
                                ]),
                                Effect.flatMap(([output, schema]) => schemaValidator.validate(output, schema)),
                                Effect.tap((validationResult) => cache.set(cacheKey, validationResult)),
                                Effect.tap(() => Effect.logInfo(`Successfully generated structured output on try ${currentTry}`))
                            );

                            return result;
                        }

                        return yield* Effect.fail(
                            new StructuredOutputPipelineError({
                                message: `Failed to generate valid structured output after ${maxRetries} attempts. Last error: ${lastError}`,
                                cause: lastError instanceof Error ? lastError : undefined
                            })
                        );
                    }),

                extractStructured: <T>(
                    text: string,
                    schema: S.Schema<T>
                ): Effect.Effect<T, StructuredOutputPipelineError> =>
                    Effect.gen(function* () {
                        yield* Effect.logInfo(`Extracting structured data from text using schema`);

                        const cacheKey = yield* cache.generateKey(text, schema);
                        const cachedResult = yield* cache.get(cacheKey);

                        if (cachedResult) {
                            yield* Effect.logInfo("Returning cached result");
                            return cachedResult as T;
                        }

                        return yield* pipe(
                            Effect.all([
                                generateMockOutput(schema),
                                Effect.succeed(schema)
                            ]),
                            Effect.flatMap(([output, s]) => schemaValidator.validate(output, s)),
                            Effect.tap((validationResult) => cache.set(cacheKey, validationResult)),
                            Effect.catchAll((error) => Effect.fail(
                                new StructuredOutputPipelineError({
                                    message: `Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error instanceof Error ? error : undefined
                                })
                            ))
                        );
                    })
            })),
        ),
        dependencies: []
    }
) { }

// Helper function to generate mock output (to be replaced with actual implementation)
const generateMockOutput = <T>(schema: S.Schema<T>): Effect.Effect<unknown, never> =>
    Effect.sync(() => {
        // This is a placeholder that should be replaced with actual implementation
        return {};
    });

/**
 * Layer for the StructuredOutputPipeline service
 */
export const StructuredOutputPipelineLayer = Layer.effect(
    StructuredOutputPipeline,
    Effect.gen(function* () {
        const service = yield* StructuredOutputPipeline;
        return service;
    })
); 