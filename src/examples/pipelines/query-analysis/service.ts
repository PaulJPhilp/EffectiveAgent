/**
 * @file Service implementation for the QueryAnalysisPipeline
 * @module ea/pipelines/query-analysis/service
 */

import { Effect } from "effect";
import {
    type Entity,
    type Intent,
    type QueryAnalysisOutput,
    type QueryAnalysisPipelineApi,
    type QueryAnalysisPipelineInput
} from "./contract.js";
import { QueryAnalysisPipelineError } from "./errors.js";

/**
 * Service for entity recognition
 */
export interface EntityRecognitionToolApi {
    readonly _tag: "EntityRecognitionTool"
    readonly extractEntities: (text: string) => Effect.Effect<Entity[], never>
}

/**
 * Service for intent classification
 */
export interface IntentClassifierToolApi {
    readonly _tag: "IntentClassifierTool"
    readonly classifyIntent: (text: string) => Effect.Effect<Intent[], never>
}

/**
 * Implementation of the EntityRecognitionTool service using Effect.Service pattern
 */
export class EntityRecognitionTool extends Effect.Service<EntityRecognitionToolApi>()("EntityRecognitionTool", {
    effect: Effect.succeed({
        _tag: "EntityRecognitionTool" as const,
        extractEntities: (text: string): Effect.Effect<Entity[], never> => {
            // Mock implementation - replace with real entity recognition
            return Effect.succeed([
                {
                    id: "entity-1",
                    type: "PERSON",
                    text: "John Doe",
                    startPosition: 0,
                    endPosition: 8,
                    confidence: 0.95,
                    metadata: {
                        title: "Mr.",
                        gender: "male"
                    }
                },
                {
                    id: "entity-2",
                    type: "ORGANIZATION",
                    text: "Acme Corp",
                    startPosition: 12,
                    endPosition: 21,
                    confidence: 0.88,
                    metadata: {
                        industry: "technology",
                        size: "large"
                    }
                }
            ]);
        }
    }),
    dependencies: []
}) { }

/**
 * Implementation of the IntentClassifierTool service using Effect.Service pattern
 */
export class IntentClassifierTool extends Effect.Service<IntentClassifierToolApi>()("IntentClassifierTool", {
    effect: Effect.succeed({
        _tag: "IntentClassifierTool" as const,
        classifyIntent: (text: string): Effect.Effect<Intent[], never> => {
            // Mock implementation - replace with real intent classification
            return Effect.succeed([
                {
                    id: "intent-1",
                    name: "search",
                    confidence: 0.82,
                    relatedEntities: ["entity-1"]
                },
                {
                    id: "intent-2",
                    name: "schedule",
                    confidence: 0.64,
                    relatedEntities: ["entity-2"]
                }
            ]);
        }
    }),
    dependencies: []
}) { }

/**
 * Implementation of the QueryAnalysisPipeline service
 */
export class QueryAnalysisPipelineService extends Effect.Service<QueryAnalysisPipelineApi>()("QueryAnalysisPipeline", {
    effect: Effect.gen(function* () {
        // Yield dependencies
        const entityRecognizer = yield* EntityRecognitionTool;
        const intentClassifier = yield* IntentClassifierTool;

        // Helper to generate a unique ID
        const generateId = (prefix: string, index: number): string =>
            `${prefix}-${index + 1}`;

        // Method implementations
        const analyzeQuery = (input: QueryAnalysisPipelineInput): Effect.Effect<QueryAnalysisOutput, QueryAnalysisPipelineError> =>
            Effect.gen(function* () {
                yield* Effect.logInfo(`Analyzing query: ${input.query}`);

                // Extract entities using the EntityRecognitionTool
                const entities = yield* entityRecognizer.extractEntities(input.query);

                // Classify intents using the IntentClassifierTool
                const intents = yield* intentClassifier.classifyIntent(input.query);

                return {
                    query: input.query,
                    entities,
                    intents,
                    sentiment: input.analyzeSentiment ? {
                        value: "positive" as const,
                        confidence: 0.72,
                        details: [
                            {
                                text: input.query,
                                sentiment: "positive" as const,
                                score: 0.72
                            }
                        ]
                    } : undefined,
                    queryType: input.query.endsWith("?") ? "question" as const : "command" as const
                };
            }).pipe(
                Effect.catchAll((error: unknown) => Effect.fail(
                    new QueryAnalysisPipelineError({
                        message: `Failed to analyze query: ${error instanceof Error ? error.message : String(error)}`,
                        cause: error
                    })
                ))
            );

        const extractEntities = (
            query: string,
            options?: Partial<Omit<QueryAnalysisPipelineInput, "query">>
        ): Effect.Effect<Entity[], QueryAnalysisPipelineError> =>
            Effect.gen(function* () {
                yield* Effect.logInfo(`Extracting entities from query: ${query}`);

                // Create full input for analyzeQuery
                const fullInput: QueryAnalysisPipelineInput = {
                    query,
                    ...options
                };

                // Reuse analyzeQuery and extract only the entities
                const result = yield* analyzeQuery(fullInput);
                return yield* Effect.succeed(result.entities);
            });

        // Return implementation of the API
        return {
            analyzeQuery,
            extractEntities
        };
    }),
    dependencies: []
}) { }

/**
 * Layer for the QueryAnalysisPipeline service
 */
export const QueryAnalysisPipelineLayer = QueryAnalysisPipelineService; 