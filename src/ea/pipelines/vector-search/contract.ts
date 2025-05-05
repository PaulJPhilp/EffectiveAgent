/**
 * @file Contract definition for the VectorSearchPipeline
 * @module ea/pipelines/vector-search/contract
 */

import { Context, Effect } from "effect";
import { PipelineError } from "../common/errors.js";

/**
 * Metadata for stored vectors
 */
export interface VectorMetadata {
    /** Unique identifier */
    id: string;
    /** Content type (text, image, audio, etc.) */
    contentType: string;
    /** Source or origin information */
    source?: string;
    /** Creation timestamp */
    createdAt: string;
    /** Custom metadata fields */
    custom?: Record<string, unknown>;
}

/**
 * Single vector search result
 */
export interface VectorSearchResult<T = unknown> {
    /** The document or content that matched */
    content: T;
    /** Metadata for this vector */
    metadata: VectorMetadata;
    /** Similarity score (higher means more similar) */
    score: number;
    /** Distance from query vector (lower means more similar) */
    distance: number;
}

/**
 * Input parameters for the VectorSearchPipeline
 */
export interface VectorSearchPipelineInput {
    /** The text query to search for */
    query: string;
    /** Number of results to return */
    limit?: number;
    /** Minimum similarity threshold (0-1) */
    threshold?: number;
    /** Filter for specific metadata values */
    filter?: Record<string, unknown>;
    /** Whether to rerank results using a separate model */
    rerank?: boolean;
    /** Whether to include the raw vector in the response */
    includeVectors?: boolean;
    /** Namespace or collection to search in */
    namespace?: string;
}

/**
 * Response from the VectorSearchPipeline
 */
export interface VectorSearchPipelineOutput<T = unknown> {
    /** The original search query */
    query: string;
    /** The search results */
    results: VectorSearchResult<T>[];
    /** Total number of potential matches */
    totalMatches: number;
    /** Execution time in milliseconds */
    executionTimeMs: number;
    /** Raw query vector if requested */
    queryVector?: number[];
}

/**
 * Input for storing vectors
 */
export interface StoreVectorsInput<T = unknown> {
    /** Items to vectorize and store */
    items: Array<{
        /** The content to vectorize */
        content: T;
        /** Associated metadata */
        metadata?: Partial<VectorMetadata>;
    }>;
    /** Whether to generate IDs if not provided */
    generateIds?: boolean;
    /** Whether to upsert if ID exists */
    upsert?: boolean;
    /** Namespace or collection to store in */
    namespace?: string;
}

/**
 * Result of storing vectors
 */
export interface StoreVectorsOutput {
    /** Number of vectors stored */
    storedCount: number;
    /** IDs of stored vectors */
    ids: string[];
    /** Execution time in milliseconds */
    executionTimeMs: number;
}

/**
 * Error specific to the VectorSearchPipeline
 */
export class VectorSearchPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VectorSearchPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the VectorSearchPipeline service
 */
export interface VectorSearchPipelineApi {
    /**
     * Performs a semantic search using vector embeddings
     * 
     * @template T The content type for search results
     * @param input - Vector search parameters
     * @returns Effect that resolves to search results or fails with pipeline error
     */
    search: <T = unknown>(
        input: VectorSearchPipelineInput
    ) => Effect.Effect<VectorSearchPipelineOutput<T>, VectorSearchPipelineError>;

    /**
     * Stores new vector embeddings for later search
     * 
     * @template T The content type to vectorize and store
     * @param input - Items to store as vectors
     * @returns Effect that resolves to storage results
     */
    storeVectors: <T = unknown>(
        input: StoreVectorsInput<T>
    ) => Effect.Effect<StoreVectorsOutput, VectorSearchPipelineError>;

    /**
     * Generates an embedding vector for text without storing it
     * 
     * @param text - The text to vectorize
     * @returns Effect that resolves to the embedding vector
     */
    generateEmbedding: (
        text: string
    ) => Effect.Effect<number[], VectorSearchPipelineError>;
}

/**
 * Service tag for the VectorSearchPipeline
 */
export class VectorSearchPipeline extends Context.Tag("VectorSearchPipeline")<
    VectorSearchPipeline,
    VectorSearchPipelineApi
>() { } 