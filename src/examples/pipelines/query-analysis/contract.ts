/**
 * @file Contract definition for the QueryAnalysisPipeline
 * @module ea/pipelines/query-analysis/contract
 */

import { Context, Effect } from "effect";
import { QueryAnalysisPipelineError } from "./errors.js";

/**
 * Represents a detected entity in a query
 */
export interface Entity {
    /** Entity identifier */
    id: string;
    /** Entity type (e.g., "person", "organization", "location", "datetime") */
    type: string;
    /** The text in the query that refers to this entity */
    text: string;
    /** Start position in the query (character index) */
    startPosition: number;
    /** End position in the query (character index) */
    endPosition: number;
    /** Confidence score for this entity detection */
    confidence: number;
    /** Additional metadata specific to the entity type */
    metadata?: Record<string, unknown>;
}

/**
 * Represents a detected intent in a query
 */
export interface Intent {
    /** Intent identifier */
    id: string;
    /** Intent name (e.g., "search", "book", "inquire") */
    name: string;
    /** Confidence score for this intent detection */
    confidence: number;
    /** Relevant entities associated with this intent */
    relatedEntities?: string[];
    /** Sub-intents if applicable */
    subIntents?: Intent[];
}

/**
 * Input parameters for the QueryAnalysisPipeline
 */
export interface QueryAnalysisPipelineInput {
    /** The query text to analyze */
    query: string;
    /** Previous conversation context for better analysis */
    conversationContext?: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    /** Whether to analyze sentiment */
    analyzeSentiment?: boolean;
    /** List of custom entity types to detect */
    customEntityTypes?: string[];
    /** List of custom intents to detect */
    customIntents?: string[];
}

/**
 * Response from the QueryAnalysisPipeline
 */
export interface QueryAnalysisOutput {
    /** The original query */
    query: string;
    /** Detected entities in the query */
    entities: Entity[];
    /** Detected intents in the query */
    intents: Intent[];
    /** Overall sentiment analysis if requested */
    sentiment?: {
        /** Overall sentiment (positive, negative, neutral) */
        value: "positive" | "negative" | "neutral";
        /** Confidence score for sentiment analysis */
        confidence: number;
        /** Detailed sentiment breakdown by sentence */
        details?: Array<{
            text: string;
            sentiment: "positive" | "negative" | "neutral";
            score: number;
        }>;
    };
    /** Classification of query type */
    queryType: "question" | "command" | "statement" | "ambiguous";
}

/**
 * API contract for the QueryAnalysisPipeline service
 */
export interface QueryAnalysisPipelineApi {
    /**
     * Analyzes a query for intents and entities
     * 
     * @param input - Query analysis request parameters
     * @returns Effect that resolves to query analysis output or fails with pipeline error
     */
    analyzeQuery: (
        input: QueryAnalysisPipelineInput
    ) => Effect.Effect<QueryAnalysisOutput, QueryAnalysisPipelineError>;

    /**
     * Extracts only entities from a query
     * 
     * @param query - The query to analyze
     * @param options - Optional parameters for entity extraction
     * @returns Effect that resolves to an array of extracted entities
     */
    extractEntities: (
        query: string,
        options?: Partial<Omit<QueryAnalysisPipelineInput, "query">>
    ) => Effect.Effect<Entity[], QueryAnalysisPipelineError>;
}

/**
 * Service tag for the QueryAnalysisPipeline
 */
export class QueryAnalysisPipeline extends Context.Tag("QueryAnalysisPipeline")<
    QueryAnalysisPipeline,
    QueryAnalysisPipelineApi
>() { } 