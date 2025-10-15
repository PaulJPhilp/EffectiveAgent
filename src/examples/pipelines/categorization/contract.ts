/**
 * @file Contract definition for the CategorizationPipeline
 * @module ea/pipelines/categorization/contract
 */

import { Context, type Effect } from "effect";
import { PipelineError } from "../common/errors.js";

/**
 * Category definition
 */
export interface Category {
    /** Unique identifier for this category */
    id: string;
    /** Human-readable name */
    name: string;
    /** Detailed description of the category */
    description?: string;
    /** Parent category ID if this is a subcategory */
    parentId?: string;
    /** Additional metadata about the category */
    metadata?: Record<string, unknown>;
}

/**
 * Categorization result for a single item
 */
export interface CategorizationResult {
    /** Item identifier */
    itemId: string;
    /** Categories assigned to the item */
    categories: Array<{
        /** Category identifier */
        categoryId: string;
        /** Confidence score (0-1) */
        confidence: number;
        /** Explanation for this categorization */
        explanation?: string;
    }>;
    /** Original content that was categorized (if requested) */
    originalContent?: unknown;
}

/**
 * Input parameters for the CategorizationPipeline
 */
export interface CategorizationPipelineInput {
    /** Items to categorize */
    items: Array<{
        /** Unique identifier for this item */
        id: string;
        /** The content to categorize */
        content: string | Record<string, unknown>;
    }>;
    /** Available categories to choose from */
    categories?: Category[];
    /** Whether to allow multiple categories per item */
    allowMultipleCategories?: boolean;
    /** Minimum confidence threshold (0-1) */
    confidenceThreshold?: number;
    /** Whether to include the original content in the results */
    includeOriginalContent?: boolean;
    /** Whether to include explanations for categorizations */
    includeExplanations?: boolean;
}

/**
 * Response from the CategorizationPipeline
 */
export interface CategorizationPipelineOutput {
    /** Results for each input item */
    results: CategorizationResult[];
    /** New categories discovered (if auto-discovery was enabled) */
    discoveredCategories?: Category[];
    /** Overall categorization statistics */
    stats?: {
        /** Number of items that couldn't be categorized */
        uncategorizedCount: number;
        /** Distribution of items across categories */
        categoryDistribution: Record<string, number>;
        /** Average confidence score */
        averageConfidence: number;
    };
}

/**
 * Error specific to the CategorizationPipeline
 */
export class CategorizationPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "CategorizationPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the CategorizationPipeline service
 */
export interface CategorizationPipelineApi {
    /**
     * Categorizes a set of items according to provided categories
     * 
     * @param input - Categorization request parameters
     * @returns Effect that resolves to categorization results or fails with pipeline error
     */
    categorize: (
        input: CategorizationPipelineInput
    ) => Effect.Effect<CategorizationPipelineOutput, CategorizationPipelineError>;

    /**
     * Discovers categories from a set of items without prior category definitions
     * 
     * @param items - Items to analyze for category discovery
     * @param options - Additional parameters for discovery process
     * @returns Effect that resolves to discovered categories and categorized items
     */
    discoverCategories: (
        items: Array<{ id: string; content: string | Record<string, unknown> }>,
        options?: {
            maxCategories?: number;
            minItemsPerCategory?: number;
            includeExplanations?: boolean;
        }
    ) => Effect.Effect<CategorizationPipelineOutput, CategorizationPipelineError>;
}

/**
 * Service tag for the CategorizationPipeline
 */
export class CategorizationPipeline extends Context.Tag("CategorizationPipeline")<
    CategorizationPipeline,
    CategorizationPipelineApi
>() { } 