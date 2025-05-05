/**
 * @file Contract definition for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/contract
 */

import { Effect } from "effect";
import { AnyPipelineError } from "../common/errors.js";

/**
 * Input parameters for the StructuredOutputPipeline
 * @template SchemaType The type of schema to structure the output as
 */
export interface StructuredOutputPipelineInput<SchemaType = Record<string, unknown>> {
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
 * @template SchemaType The type of schema to structure the output as
 */
export interface StructuredOutputPipelineApi {
    /**
     * Processes input text and returns a structured output matching the provided schema
     * 
     * @template T The expected return type based on the schema
     * @template S The schema type used for structuring
     * @param input - Structured output request parameters
     * @returns Effect that resolves to the structured output data or fails with pipeline error
     */
    generateStructuredOutput: <T, S = unknown>(
        input: StructuredOutputPipelineInput<S>
    ) => Effect.Effect<T, StructuredOutputPipelineError>;

    /**
     * Extracts specific fields from unstructured text based on a schema
     * 
     * @template T The expected return type based on the schema
     * @template S The schema type used for extraction
     * @param text - The text to extract data from
     * @param schema - The schema defining the fields to extract
     * @returns Effect that resolves to the extracted structured data
     */
    extractStructured: <T, S = unknown>(
        text: string,
        schema: S
    ) => Effect.Effect<T, StructuredOutputPipelineError>;
}

/**
 * Service tag for the StructuredOutputPipeline
 */
export const StructuredOutputPipeline = Effect.GenericTag<StructuredOutputPipelineApi>("StructuredOutputPipeline"); 