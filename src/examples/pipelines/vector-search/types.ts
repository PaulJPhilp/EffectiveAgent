/**
 * @file Types for vector search pipeline
 * @module examples/pipelines/vector-search/types
 */

export interface Vector {
    readonly id: string;
    readonly values: ReadonlyArray<number>;
    readonly metadata?: Record<string, unknown>;
}

export interface SearchResult {
    readonly id: string;
    readonly vector: Vector;
    readonly similarity: number;
} 