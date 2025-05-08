/**
 * @file Contract definition for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/contract
 */

import { Effect } from "effect";
import { AnyPipelineError } from "../common/errors.js";
import { PipelineApi, PipelineInput, PipelineOutput } from "../common/pipeline.js";

/**
 * Defines the payload for generating structured output.
 */
export interface GenerateStructuredOutputPayload<SchemaType = Record<string, unknown>> {
    /** The prompt or text to process */
    prompt: string;
    /** The schema definition to structure the output according to */
    schema: SchemaType;
    /** Optional examples of desired output format */
    examples?: Array<{
        input: string;
        output: unknown;
    }>;
    /** Maximum number of retries for validation failures */
    maxRetries?: number;
}

/**
 * Defines the payload for extracting structured data.
 */
export interface ExtractStructuredPayload<SchemaType = Record<string, unknown>> {
    /** The text to extract data from */
    text: string;
    /** The schema defining the fields to extract */
    schema: SchemaType;
}

/**
 * Union type for all possible operation payloads for the StructuredOutputPipeline.
 */
type StructuredOutputOperationPayload<SchemaType = Record<string, unknown>> =
    | ({ operationType: "generate" } & GenerateStructuredOutputPayload<SchemaType>)
    | ({ operationType: "extract" } & ExtractStructuredPayload<SchemaType>);

/**
 * Input for the StructuredOutputPipeline's execute method.
 * @template SchemaType The type of schema to structure the output as.
 */
export interface StructuredOutputPipelineExecuteInput<SchemaType = Record<string, unknown>>
    extends PipelineInput<StructuredOutputOperationPayload<SchemaType>> { }

/**
 * Output for the StructuredOutputPipeline's execute method.
 * @template ResultType The type of the structured result.
 */
export interface StructuredOutputPipelineExecuteOutput<ResultType = Record<string, unknown>>
    extends PipelineOutput<ResultType> { }

/**
 * Error specific to the StructuredOutputPipeline
 */
export class StructuredOutputPipelineError extends AnyPipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "StructuredOutputPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the StructuredOutputPipeline service
 * Implements the generic PipelineApi for standardized execution.
 * @template SchemaType The type of schema to structure the output as
 */
export interface StructuredOutputPipelineApi<SchemaType = Record<string, unknown>>
    extends PipelineApi<
        StructuredOutputPipelineExecuteInput<SchemaType>,
        StructuredOutputPipelineExecuteOutput<unknown>, // ResultType is unknown here, T in methods
        StructuredOutputPipelineError
    > {
    /**
     * Processes input text and returns a structured output matching the provided schema.
     * This is one of the specific operations of this pipeline.
     * 
     * @template T The expected return type based on the schema.
     * @param input - Parameters for generating structured output.
     * @returns Effect that resolves to the structured output data or fails with a pipeline error.
     */
    generateStructuredOutput: <T>(
        input: GenerateStructuredOutputPayload<SchemaType>
    ) => Effect.Effect<T, StructuredOutputPipelineError>;

    /**
     * Extracts specific fields from unstructured text based on a schema.
     * This is one of the specific operations of this pipeline.
     * 
     * @template T The expected return type based on the schema.
     * @param text - The text to extract data from.
     * @param schema - The schema defining the fields to extract.
     * @returns Effect that resolves to the extracted structured data or fails with a pipeline error.
     */
    extractStructured: <T>(
        text: string,
        schema: SchemaType
    ) => Effect.Effect<T, StructuredOutputPipelineError>;
}

/**
 * Service tag for the StructuredOutputPipeline
 */
export const StructuredOutputPipeline = Effect.GenericTag<StructuredOutputPipelineApi<unknown>>(
    "StructuredOutputPipeline"
); 