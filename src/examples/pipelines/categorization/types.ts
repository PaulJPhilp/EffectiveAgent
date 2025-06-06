/**
 * @file Types for categorization pipeline
 * @module examples/pipelines/categorization/types
 */

export interface EmbeddingResult {
    readonly vector: ReadonlyArray<number>;
    readonly dimensions: number;
    readonly model: string;
}

export interface ClusteringResult {
    readonly clusters: ReadonlyArray<{
        readonly id: string;
        readonly label: string;
        readonly members: ReadonlyArray<EmbeddingResult>;
    }>;
    readonly method: string;
} 