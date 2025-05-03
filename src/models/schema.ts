/**
 * @file Defines the schema for AI model definitions, capturing both vendor claims
 * and benchmark-derived proficiency information.
 */

import { Schema as S } from "effect";
// Import necessary types from the core schema file
import {
    ModelCapability,
    SubDimensionProficiency
} from "../schema.js";

/**
 * Describes a model's capability, allowing for either an overall proficiency
 * or a detailed breakdown by sub-dimensions.
 */
export class ModelCapabilityDetail extends S.Class<ModelCapabilityDetail>("ModelCapabilityDetail")({
    /** The core capability */
    capability: ModelCapability,
    /** Optional overall proficiency (useful for simpler capabilities) */
    overallProficiency: S.Literal(
        "basic",
        "intermediate",
        "advanced"
    ).pipe(S.optional),
    /** Optional detailed proficiency breakdown for complex capabilities */
    subDimensions: S.Array(SubDimensionProficiency).pipe(S.optional)
}) { }

/**
 * Defines the structure for storing information about an AI model,
 * separating vendor claims from benchmark-derived proficiency.
 */
export class ModelDefinition extends S.Class<ModelDefinition>("ModelDefinition")({
    /** Unique identifier for the model (e.g., "openai/gpt-4-turbo") */
    id: S.String,
    /** The provider or company (e.g., "openai", "google", "anthropic") */
    provider: S.String,
    /** Human-readable name */
    displayName: S.String,

    // --- Vendor-Provided Information ---
    /**
     * List of capabilities as claimed by the vendor/provider.
     * Example: ["chat", "tool-use", "vision"]
     */
    vendorCapabilities: S.Array(ModelCapability),

    // --- Agent-Derived Information (from Benchmarks) ---
    /**
     * List of capabilities with proficiency tiers calculated by the agent
     * based on benchmark analysis. Updated periodically.
     * Example: [
     *   { capability: "tool-use", overallProficiency: "advanced" },
     *   { capability: "reasoning", overallProficiency: "intermediate" }
     * ]
     */
    derivedProficiencies: S.Array(ModelCapabilityDetail).pipe(S.optional),

    // --- Other potential useful fields ---
    contextWindow: S.Number.pipe(S.int(), S.positive(), S.optional),
    // Add fields for cost, rate limits, etc. if needed
}) { } 