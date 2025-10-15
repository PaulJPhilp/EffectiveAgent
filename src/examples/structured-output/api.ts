/**
 * @file Contract for StructuredOutputPipeline and its internal services
 * @module ea/pipelines/structured-output/contract
 */

import { Data, Effect, type Schema } from "effect";

// === Errors ===

/**
 * Base error for the StructuredOutputPipeline.
 */
export class StructuredOutputPipelineError extends Data.TaggedError("StructuredOutputPipelineError")<{
    readonly message: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when schema validation fails for the SchemaValidatorTool.
 */
export class SchemaValidationError extends Data.TaggedError("SchemaValidationError")<{
    readonly message: string;
    readonly validationIssues: readonly string[];
    readonly cause?: unknown;
}> {
    readonly _tag = "SchemaValidationError";

    constructor(params: { message: string; validationIssues: readonly string[]; cause?: unknown }) {
        super({
            message: `Schema validation failed: ${params.message}`,
            validationIssues: params.validationIssues,
            cause: params.cause
        });
    }
}

// === SchemaValidatorTool ===

/**
 * API for a service that validates data against a schema.
 */
export interface SchemaValidatorToolApi {
    readonly validate: <A>(data: unknown, schema: Schema.Schema<A, unknown>) => Effect.Effect<A, SchemaValidationError>;
}

/**
 * SchemaValidatorTool Effect Service.
 */
export class SchemaValidatorTool extends Effect.Service<SchemaValidatorToolApi>()(
    "SchemaValidatorTool",
    {
        effect: Effect.gen(function* () {
            return {
                validate: <A>(data: unknown, schema: Schema.Schema<A, unknown>) => Effect.fail(
                    new SchemaValidationError({
                        message: "Validation not implemented by default",
                        validationIssues: []
                    })
                )
            };
        }),
        dependencies: []
    }
) { }


// === StructuredOutputPipeline ===

/**
 * Payload for generating structured output.
 */
export interface GenerateStructuredOutputPayload<S extends Schema.Schema<any, any>> {
    readonly prompt: string;
    readonly schema: S;
    readonly modelId?: string;
    readonly examples?: ReadonlyArray<{ readonly input: string; readonly output: Schema.Schema.Type<S> }>;
}

/**
 * API for the StructuredOutputPipeline.
 */
export interface StructuredOutputPipelineApi {
    readonly generateStructuredOutput: <A>(
        input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>,
        maxRetries?: number
    ) => Effect.Effect<A, StructuredOutputPipelineError>;

    readonly extractStructured: <A>(
        text: string,
        schema: Schema.Schema<A, A>,
        options?: { maxRetries?: number; modelId?: string }
    ) => Effect.Effect<A, StructuredOutputPipelineError>;
}

/**
 * StructuredOutputPipeline Effect Service.
 */
export class StructuredOutputPipeline extends Effect.Service<StructuredOutputPipelineApi>()(
    "StructuredOutputPipeline",
    {
        effect: Effect.gen(function* () {
            return {
                generateStructuredOutput: <A>(
                    input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>,
                    maxRetries?: number
                ) => Effect.fail(new StructuredOutputPipelineError({ message: "generateStructuredOutput not implemented by default" })),
                extractStructured: <A>(
                    text: string,
                    schema: Schema.Schema<A, A>,
                    options?: { maxRetries?: number; modelId?: string }
                ) => Effect.fail(new StructuredOutputPipelineError({ message: "extractStructured not implemented by default" }))
            };
        }),
        dependencies: []
    }
) { } 