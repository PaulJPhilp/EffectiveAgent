/**
 * @file Contract for StructuredOutputPipeline and its internal services
 * @module ea/pipelines/structured-output/contract
 */

import type * as S from "@effect/schema/Schema";
import { Data, Effect } from "effect";

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
export class SchemaValidationError extends StructuredOutputPipelineError {
    readonly _tag = "SchemaValidationError"; // Add discriminator for this specific error
    readonly validationIssues: readonly string[];

    constructor(params: { message: string; validationIssues: readonly string[]; cause?: unknown }) {
        super({
            message: `Schema validation failed: ${params.message}`,
            cause: params.cause,
        });
        this.validationIssues = params.validationIssues;
    }
}

// === SchemaValidatorTool ===

/**
 * API for a service that validates data against a schema.
 */
export interface SchemaValidatorToolApi {
    readonly validate: <I, A>(data: I, schema: S.Schema<A, I>) => Effect.Effect<A, SchemaValidationError>;
}

/**
 * SchemaValidatorTool Effect Service.
 */
export abstract class SchemaValidatorTool extends Effect.Service<SchemaValidatorToolApi>()(
    "SchemaValidatorTool",
    {
        // Minimal default implementation
        validate: <I, A>(data: I, schema: S.Schema<A, I>) => Effect.fail(
            new SchemaValidationError({
                message: "Validation not implemented by default",
                validationIssues: []
            })
        )
    }
) { }


// === StructuredOutputPipeline ===

/**
 * Payload for generating structured output.
 */
export interface GenerateStructuredOutputPayload<SchemaType extends S.Schema<any, any>> {
    readonly prompt: string;
    readonly schema: SchemaType;
    readonly examples?: ReadonlyArray<{ readonly input: string; readonly output: S.Schema.Type<SchemaType> }>;
}

/**
 * API for the StructuredOutputPipeline.
 */
export interface StructuredOutputPipelineApi {
    readonly generateStructuredOutput: <A, I>(
        input: GenerateStructuredOutputPayload<S.Schema<A, I>>,
        maxRetries?: number
    ) => Effect.Effect<A, StructuredOutputPipelineError>;

    readonly extractStructured: <A, I>(
        text: string,
        schema: S.Schema<A, I>
    ) => Effect.Effect<A, StructuredOutputPipelineError>;
}

/**
 * StructuredOutputPipeline Effect Service.
 */
export abstract class StructuredOutputPipeline extends Effect.Service<StructuredOutputPipelineApi>()(
    "StructuredOutputPipeline",
    {
        // Minimal default implementation
        generateStructuredOutput: <A, I>(
            input: GenerateStructuredOutputPayload<S.Schema<A, I>>,
            maxRetries?: number
        ) => Effect.fail(new StructuredOutputPipelineError({ message: "generateStructuredOutput not implemented by default" })),
        extractStructured: <A, I>(
            text: string,
            schema: S.Schema<A, I>
        ) => Effect.fail(new StructuredOutputPipelineError({ message: "extractStructured not implemented by default" }))
    }
) { } 