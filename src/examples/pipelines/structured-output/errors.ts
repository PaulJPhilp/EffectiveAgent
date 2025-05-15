/**
 * @file Error definitions for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/errors
 */

import type { EffectiveUsage } from "@/types.js";
import { PipelineError } from "../common/errors.js";

/**
 * Base error class for StructuredOutputPipeline errors
 */
export class StructuredOutputPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "StructuredOutputPipeline",
            cause: params.cause,
        });
    }
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends StructuredOutputPipelineError {
    readonly validationIssues: string[];
    readonly invalidValue: unknown;
    readonly schemaPath?: string;

    constructor(params: {
        message: string;
        validationIssues: string[];
        invalidValue: unknown;
        schemaPath?: string;
        cause?: unknown;
    }) {
        super({
            message: `Schema validation failed: ${params.message}`,
            cause: params.cause,
        });
        this.validationIssues = params.validationIssues;
        this.invalidValue = params.invalidValue;
        this.schemaPath = params.schemaPath;
    }

    /**
     * Get a formatted string of validation issues
     */
    getFormattedIssues(): string {
        return this.validationIssues
            .map((issue, index) => `${index + 1}. ${issue}`)
            .join("\n");
    }
}

/**
 * Error thrown when schema parsing fails
 */
export class SchemaParsingError extends StructuredOutputPipelineError {
    readonly schemaSource: unknown;

    constructor(params: {
        message: string;
        schemaSource: unknown;
        cause?: unknown;
    }) {
        super({
            message: `Schema parsing failed: ${params.message}`,
            cause: params.cause,
        });
        this.schemaSource = params.schemaSource;
    }
}

/**
 * Error thrown when maximum retries are exceeded
 */
export class MaxRetriesExceededError extends StructuredOutputPipelineError {
    readonly attempts: number;
    readonly lastAttemptError?: Error;
    readonly validationHistory: Array<{
        attempt: number;
        error: string;
        timestamp: Date;
    }>;

    constructor(params: {
        message: string;
        attempts: number;
        lastAttemptError?: Error;
        validationHistory: Array<{
            attempt: number;
            error: string;
            timestamp: Date;
        }>;
        cause?: unknown;
    }) {
        super({
            message: `Max retries exceeded after ${params.attempts} attempts: ${params.message}`,
            cause: params.cause,
        });
        this.attempts = params.attempts;
        this.lastAttemptError = params.lastAttemptError;
        this.validationHistory = params.validationHistory;
    }

    /**
     * Get a formatted history of validation attempts
     */
    getValidationHistory(): string {
        return this.validationHistory
            .map(({ attempt, error, timestamp }) =>
                `Attempt ${attempt} at ${timestamp.toISOString()}: ${error}`
            )
            .join("\n");
    }
}

/**
 * Error thrown when the LLM fails to generate valid output
 */
export class GenerationError extends StructuredOutputPipelineError {
    readonly modelId: string;
    readonly prompt: string;
    readonly usage?: EffectiveUsage;

    constructor(params: {
        message: string;
        modelId: string;
        prompt: string;
        usage?: EffectiveUsage;
        cause?: unknown;
    }) {
        super({
            message: `Generation failed with model ${params.modelId}: ${params.message}`,
            cause: params.cause,
        });
        this.modelId = params.modelId;
        this.prompt = params.prompt;
        this.usage = params.usage;
    }
}

/**
 * Error thrown when extraction fails
 */
export class ExtractionError extends StructuredOutputPipelineError {
    readonly sourceText: string;
    readonly extractionPattern?: string;

    constructor(params: {
        message: string;
        sourceText: string;
        extractionPattern?: string;
        cause?: unknown;
    }) {
        super({
            message: `Extraction failed: ${params.message}`,
            cause: params.cause,
        });
        this.sourceText = params.sourceText;
        this.extractionPattern = params.extractionPattern;
    }
}

/**
 * Union type of all StructuredOutputPipeline error types
 */
export type StructuredOutputPipelineErrorType =
    | SchemaValidationError
    | SchemaParsingError
    | MaxRetriesExceededError
    | GenerationError
    | ExtractionError; 