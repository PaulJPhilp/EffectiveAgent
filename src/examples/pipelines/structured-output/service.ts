/**
 * @file Service implementation for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/service
 */

import * as S from "@effect/schema/Schema";
import { Effect, Layer } from "effect";
import { CacheService } from "./cache/contract.js";
import {
    type GenerateStructuredOutputPayload,
    SchemaValidationError,
    SchemaValidatorTool,
    type SchemaValidatorToolApi,
    StructuredOutputPipeline,
    type StructuredOutputPipelineApi,
    StructuredOutputPipelineError
} from "./contract.js";

/**
 * Creates a mock implementation of the SchemaValidatorToolApi.
 * This version indicates that the functionality is not truly implemented.
 */
export function makeMockSchemaValidatorToolImpl(): SchemaValidatorToolApi {
    return {
        validate: <I, A>(data: I, schema: S.Schema<A, I>): Effect.Effect<A, SchemaValidationError> =>
            Effect.fail(new SchemaValidationError({
                message: "Mock validation: Not implemented",
                validationIssues: []
            }))
    };
}

/**
 * Creates a "live" implementation of the SchemaValidatorToolApi.
 * For this example, it behaves like the mock (not implemented).
 * In a real scenario, this would contain actual validation logic.
 */
export function makeSchemaValidatorToolImpl(): SchemaValidatorToolApi {
    // Placeholder: In a real implementation, this would use S.decode or S.validate
    return {
        validate: <I, A>(data: I, schema: S.Schema<A, I>): Effect.Effect<A, SchemaValidationError> =>
            S.decodeUnknown(schema)(data, { errors: "all" }).pipe(
                Effect.mapError(parseError => new SchemaValidationError({
                    message: "Schema validation failed.",
                    validationIssues: parseError.errors.map(e => JSON.stringify(e))
                }))
            )
    };
}

const makeSchemaValidatorToolLiveEffect = Effect.succeed(makeSchemaValidatorToolImpl());
const makeSchemaValidatorToolTestEffect = Effect.succeed(makeMockSchemaValidatorToolImpl());

/**
 * Live Layer for SchemaValidatorTool.
 */
export const SchemaValidatorToolLiveLayer = Layer.effect(SchemaValidatorTool, makeSchemaValidatorToolLiveEffect);

/**
 * Test Layer for SchemaValidatorTool.
 */
export const SchemaValidatorToolTestLayer = Layer.effect(SchemaValidatorTool, makeSchemaValidatorToolTestEffect);

/**
 * Converts a schema to a human-readable description
 */
const schemaToDescription = <A, I>(schema: S.Schema<A, I>): string => {
    return JSON.stringify(S.AST.toJSON(schema.ast), null, 2);
};

/**
 * Helper function to generate mock output (to be replaced with actual LLM call)
 * This will be used by makeStructuredOutputPipelineImpl later
 */
const generateMockLlmOutput = <A, I>(schema: S.Schema<A, I>): Effect.Effect<I, never> =>
    Effect.sync(() => {
        // This is a placeholder. In a real scenario, this would involve an LLM call
        // and would attempt to produce data conforming to the schema.
        // For testing, it might return a known good or bad structure.
        // Returning an empty object might not be valid for all schemas.
        // Depending on schema, might need more sophisticated mock generation.
        return {} as I; // Casting, as {} is not guaranteed to be of type I
    });

/**
 * StructuredOutputPipeline service implementation
 */
export function makeStructuredOutputPipelineImpl(dependencies: {
    readonly schemaValidator: SchemaValidatorToolApi;
    readonly cache: CacheServiceApi;
}): StructuredOutputPipelineApi {
    const { schemaValidator, cache } = dependencies;

    const generateStructuredOutput = <A, I>(
        input: GenerateStructuredOutputPayload<S.Schema<A, I>>,
        maxRetries: number = 3
    ): Effect.Effect<A, StructuredOutputPipelineError> =>
        Effect.gen(function* () {
            yield* Effect.logInfo(`Generating structured output for prompt: ${input.prompt.substring(0, 50)}...`);
            const cacheKey = yield* cache.generateKey(input.prompt, input.schema);
            const cachedResult = yield* cache.get(cacheKey);

            if (cachedResult !== undefined) {
                yield* Effect.logInfo("Returning cached result from generateStructuredOutput");
                return cachedResult as A;
            }

            let formattedPrompt = input.prompt;
            formattedPrompt += `\n\nPlease provide output in the following format:\n${schemaToDescription(input.schema)}`;
            if (input.examples?.length) {
                formattedPrompt += "\n\nHere are some examples:\n" + input.examples
                    .map((ex) => `Input: ${ex.input}\nOutput: ${JSON.stringify(ex.output, null, 2)}`)
                    .join("\n\n");
            }

            let lastValidationError: SchemaValidationError | undefined;

            for (let currentTry = 1; currentTry <= maxRetries; currentTry++) {
                yield* Effect.logDebug(`Attempt #${currentTry} for prompt: ${input.prompt.substring(0, 20)}`);
                const llmOutput = yield* generateMockLlmOutput(input.schema); // Using formattedPrompt is for LLM, mock doesn't use it yet

                const result = yield* Effect.either(schemaValidator.validate(llmOutput, input.schema));

                if (result._tag === "Right") {
                    yield* cache.set(cacheKey, result.right);
                    yield* Effect.logInfo(`Successfully generated structured output on try ${currentTry}`);
                    return result.right;
                } else {
                    lastValidationError = result.left;
                    yield* Effect.logWarning(`Validation failed on try ${currentTry}: ${result.left.message}`);
                    if (currentTry === maxRetries) {
                        // Break or let loop end, error is thrown after loop
                        break;
                    }
                    // Optionally, add a small delay here before retrying
                    // yield* Effect.sleep("100 millis") 
                }
            }

            // If loop finished without returning, all retries failed
            return yield* Effect.fail(new StructuredOutputPipelineError({
                message: `Failed to generate valid structured output after ${maxRetries} attempts. Last error: ${lastValidationError?.message || 'Unknown validation error'}`,
                cause: lastValidationError
            }));
        });

    const extractStructured = <A, I>(
        text: string,
        schema: S.Schema<A, I>
    ): Effect.Effect<A, StructuredOutputPipelineError> =>
        Effect.gen(function* () {
            yield* Effect.logInfo(`Extracting structured data from text using schema`);
            const cacheKey = yield* cache.generateKey(text, schema);
            const cachedResult = yield* cache.get(cacheKey);

            if (cachedResult !== undefined) {
                yield* Effect.logInfo("Returning cached result");
                return cachedResult as A;
            }

            const llmOutput = yield* generateMockLlmOutput(schema);
            return yield* schemaValidator.validate(llmOutput, schema).pipe(
                Effect.tap(validationResult => cache.set(cacheKey, validationResult)),
                Effect.catchAll((error) => {
                    if (error instanceof StructuredOutputPipelineError) return Effect.fail(error);
                    if (error instanceof SchemaValidationError) { // Be more specific
                        return Effect.fail(new StructuredOutputPipelineError({
                            message: `Failed to extract structured data due to validation: ${error.message}`,
                            cause: error
                        }));
                    }
                    return Effect.fail(new StructuredOutputPipelineError({
                        message: `Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`,
                        cause: error
                    }));
                })
            );
        });

    return {
        generateStructuredOutput,
        extractStructured
    };
}

export function makeMockStructuredOutputPipelineImpl(dependencies: {
    readonly schemaValidator: SchemaValidatorToolApi;
    readonly cache: CacheServiceApi;
}): StructuredOutputPipelineApi {
    const { cache } = dependencies;
    return {
        generateStructuredOutput: <A, I>(
            input: GenerateStructuredOutputPayload<S.Schema<A, I>>,
            maxRetries: number = 3
        ): Effect.Effect<A, StructuredOutputPipelineError> =>
            Effect.succeed(input.schema.ast._tag === "Literal"
                ? input.schema.ast.literal
                : {} as A).pipe( // Basic mock, attempts to use literal from schema if possible
                    Effect.tap(() => Effect.logInfo("Mock generateStructuredOutput called")),
                    Effect.flatMap(mockData =>
                        cache.set(`mockKey_gen_${input.prompt.substring(0, 10)}`, mockData).pipe(Effect.as(mockData))
                    )
                ),
        extractStructured: <A, I>(
            text: string,
            schema: S.Schema<A, I>
        ): Effect.Effect<A, StructuredOutputPipelineError> =>
            Effect.succeed(schema.ast._tag === "Literal"
                ? schema.ast.literal
                : {} as A).pipe(
                    Effect.tap(() => Effect.logInfo("Mock extractStructured called")),
                    Effect.flatMap(mockData =>
                        cache.set(`mockKey_ext_${text.substring(0, 10)}`, mockData).pipe(Effect.as(mockData))
                    )
                ),
    };
}

// Layers
const makeStructuredOutputPipelineLiveEffect = Effect.gen(function* () {
    const schemaValidator = yield* SchemaValidatorTool;
    const cache = yield* CacheService;
    return makeStructuredOutputPipelineImpl({ schemaValidator, cache });
});

export const StructuredOutputPipelineLiveLayer = Layer.effect(
    StructuredOutputPipeline,
    makeStructuredOutputPipelineLiveEffect
);

const makeStructuredOutputPipelineTestEffect = Effect.gen(function* () {
    const schemaValidator = yield* SchemaValidatorTool;
    const cache = yield* CacheService;
    return makeMockStructuredOutputPipelineImpl({ schemaValidator, cache });
});

export const StructuredOutputPipelineTestLayer = Layer.effect(
    StructuredOutputPipeline,
    makeStructuredOutputPipelineTestEffect
); 