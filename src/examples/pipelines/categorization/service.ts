/**
 * @file Service implementation for the CategorizationPipeline
 * @module ea/pipelines/categorization/service
 */

import { Effect } from "effect";
import {
    type CategorizationPipelineApi,
    CategorizationPipelineError,
    type CategorizationPipelineInput,
    type CategorizationPipelineOutput,
    type CategorizationResult,
    type Category
} from "./contract.js";
import { type ClusteringResult, type EmbeddingResult } from "./types.js";

/**
 * Service for generating embeddings
 */
export interface EmbeddingProviderApi {
    readonly _tag: "EmbeddingProvider"
    readonly generateEmbedding: (text: string) => Effect.Effect<EmbeddingResult, never>
}

/**
 * Implementation of the EmbeddingProvider service using Effect.Service pattern
 */
export class EmbeddingProvider extends Effect.Service<EmbeddingProviderApi>()("EmbeddingProvider", {
    effect: Effect.succeed({
        _tag: "EmbeddingProvider" as const,
        generateEmbedding: (text: string): Effect.Effect<EmbeddingResult, never> => {
            // Mock implementation - replace with real embedding generation
            return Effect.succeed({
                vector: Array.from({ length: 10 }, () => Math.random()),
                dimensions: 10,
                model: "mock-embedding-model"
            });
        }
    }),
    dependencies: []
}) { }

/**
 * Service for clustering data
 */
export interface ClusteringServiceApi {
    readonly _tag: "ClusteringService"
    readonly clusterData: (embeddings: EmbeddingResult[]) => Effect.Effect<ClusteringResult, never>
}

/**
 * Implementation of the ClusteringService using Effect.Service pattern
 */
export class ClusteringService extends Effect.Service<ClusteringServiceApi>()("ClusteringService", {
    effect: Effect.succeed({
        _tag: "ClusteringService" as const,
        clusterData: (embeddings: EmbeddingResult[]): Effect.Effect<ClusteringResult, never> => {
            // Mock implementation - replace with real clustering logic
            return Effect.succeed({
                clusters: [
                    {
                        id: "cluster-1",
                        label: "Group 1",
                        members: embeddings.slice(0, Math.floor(embeddings.length / 2))
                    },
                    {
                        id: "cluster-2",
                        label: "Group 2",
                        members: embeddings.slice(Math.floor(embeddings.length / 2))
                    }
                ],
                method: "mock-clustering"
            });
        }
    }),
    dependencies: []
}) { }

/**
 * Implementation of the CategorizationPipeline service
 */
export class CategorizationPipelineService extends Effect.Service<CategorizationPipelineApi>()(
    "CategorizationPipeline",
    {
        effect: Effect.gen(function* () {
            // Yield dependencies
            const embeddings = yield* EmbeddingProvider;
            const clustering = yield* ClusteringService;

            // Helper to generate a unique ID with a given prefix
            const generateId = (prefix: string, index: number): string =>
                `${prefix}-${index + 1}`;

            // Method implementations
            const categorize = (input: CategorizationPipelineInput): Effect.Effect<CategorizationPipelineOutput, CategorizationPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.logInfo(`Categorizing ${input.items.length} items into ${input.categories?.length || 'auto-discovered'} categories`);

                    // Generate embeddings for each item
                    const itemEmbeddings = yield* Effect.forEach(
                        input.items,
                        item => embeddings.generateEmbedding(
                            typeof item.content === 'string' ?
                                item.content :
                                JSON.stringify(item.content)
                        )
                    );

                    // Use clustering to group similar items
                    const clusterResult = yield* clustering.clusterData(itemEmbeddings);

                    // Mock categories if none provided
                    const categories = input.categories || clusterResult.clusters.map((cluster, i) => ({
                        id: `cat-${i + 1}`,
                        name: cluster.label
                    }));

                    // Mock categorization results
                    const results: CategorizationResult[] = input.items.map((item, index) => {
                        // Randomly assign 1-2 categories
                        const numCategories = input.allowMultipleCategories ?
                            Math.floor(Math.random() * 2) + 1 : 1;

                        // Randomly select categories
                        const selectedCategories = [...categories]
                            .sort(() => Math.random() - 0.5)
                            .slice(0, numCategories)
                            .map(category => ({
                                categoryId: category.id,
                                confidence: 0.6 + Math.random() * 0.4, // Random confidence between 0.6 and 1.0
                                explanation: input.includeExplanations ?
                                    `Item "${item.id}" was assigned to ${category.name} based on content similarity` :
                                    undefined
                            }));

                        return {
                            itemId: item.id,
                            categories: selectedCategories,
                            originalContent: input.includeOriginalContent ? item.content : undefined
                        };
                    });

                    // Generate statistics
                    const uncategorizedCount = results.filter(r => r.categories.length === 0).length;
                    const categoryDistribution: Record<string, number> = {};
                    let totalConfidence = 0;
                    let totalCategorizations = 0;

                    // Calculate category distribution and average confidence
                    results.forEach(result => {
                        result.categories.forEach(cat => {
                            categoryDistribution[cat.categoryId] = (categoryDistribution[cat.categoryId] || 0) + 1;
                            totalConfidence += cat.confidence;
                            totalCategorizations++;
                        });
                    });

                    return {
                        results,
                        stats: {
                            uncategorizedCount,
                            categoryDistribution,
                            averageConfidence: totalCategorizations > 0 ?
                                totalConfidence / totalCategorizations : 0
                        }
                    };
                }).pipe(
                    Effect.catchAll((caughtError: unknown) => Effect.fail(new CategorizationPipelineError({
                        message: `Categorization failed: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
                        cause: caughtError
                    })))
                );

            const discoverCategories = (
                items: Array<{ id: string; content: string | Record<string, unknown> }>,
                options?: {
                    maxCategories?: number;
                    minItemsPerCategory?: number;
                    includeExplanations?: boolean;
                }
            ): Effect.Effect<CategorizationPipelineOutput, CategorizationPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.logInfo(`Discovering categories from ${items.length} items`);

                    // Generate embeddings for items
                    const itemEmbeddings = yield* Effect.forEach(
                        items,
                        item => embeddings.generateEmbedding(
                            typeof item.content === 'string' ?
                                item.content :
                                JSON.stringify(item.content)
                        )
                    );

                    // Use clustering to discover categories
                    const clusterResult = yield* clustering.clusterData(itemEmbeddings);

                    // Create categories from clusters
                    const discoveredCategories: Category[] = clusterResult.clusters.map((cluster, i) => ({
                        id: generateId("discovered-cat", i),
                        name: cluster.label,
                        description: `This category was automatically discovered from content patterns.`,
                        metadata: {
                            keyTerms: ["term1", "term2", "term3"],
                            avgSimilarity: 0.75 + Math.random() * 0.2
                        }
                    }));

                    // Create input for the categorize method
                    const categorizationInput: CategorizationPipelineInput = {
                        items,
                        categories: discoveredCategories,
                        allowMultipleCategories: false,
                        includeExplanations: options?.includeExplanations,
                        includeOriginalContent: false
                    };

                    // Use the categorize method to assign items to the discovered categories
                    const result = yield* categorize(categorizationInput);

                    // Add discovered categories to the result
                    return {
                        ...result,
                        discoveredCategories
                    };
                }).pipe(
                    Effect.catchAll((caughtError: unknown) => Effect.fail(new CategorizationPipelineError({
                        message: `Category discovery failed: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
                        cause: caughtError
                    })))
                );

            // Return implementation of the API
            return {
                categorize,
                discoverCategories
            };
        })
    }
) { }

/**
 * Layer for the CategorizationPipeline service
 */
export const CategorizationPipelineLayer = CategorizationPipelineService; 