/**
 * @file Defines Zod schemas for Intelligence Profiles and their configuration.
 * Intelligence profiles dictate model selection, parameter constraints, and memory requirements.
 */

import { z } from "zod";

// --- Supporting Schemas ---

// Schema for specifying desired model characteristics
// TODO: Align 'capability' values with those defined in ai/model/types.ts later
const ModelCharacteristicSchema = z.object({
    capability: z.string().optional(), // e.g., "vision", "code-generation", "reasoning"
    minContextWindow: z.number().int().positive().optional(),
    // Add other characteristics like speed preference ("low-latency"), cost preference ("low-cost")?
    // qualityPreference: z.enum(["low", "medium", "high"]).optional(),
}).strict(); // Be strict about defined characteristics

// Schema for specifying a preferred model, either by ID or characteristics
const ModelPreferenceSchema = z.union([
    z.string().min(1), // Direct modelId (e.g., "openai/gpt-4o")
    ModelCharacteristicSchema, // Desired characteristics
]);

// Schema defining memory requirements
const MemoryRequirementSchema = z.object({
    /** Whether short-term conversational history is required/used. */
    shortTerm: z.boolean().default(true), // Required with default
    /** Configuration for long-term memory access. */
    longTerm: z.union([
        z.literal(false), // Explicitly no long-term memory
        z.object({ // Configuration for required long-term memory
            /** Type of long-term store needed. */
            type: z.enum(["vector", "database", "knowledge-graph"]), // Add other types later
            /** Identifier for the specific store/index/table (e.g., vector index name). Allows profiles like "legalExpert" to specify "legal_docs" index. */
            storeIdentifier: z.string().min(1).optional(),
            /** Optional: Specify read/write access needed? */
            // access: z.enum(["read", "read-write"]).default("read"),
            /** Optional: Number of results to retrieve for RAG. */
            // retrievalCount: z.number().int().positive().optional(),
        })
    ]).default(false), // Default to no long-term memory
});
export type MemoryRequirement = z.infer<typeof MemoryRequirementSchema>;

// --- Main Intelligence Profile Schema ---

export const IntelligenceProfileSchema = z.object({
    /** Unique name/identifier for the intelligence profile (e.g., "analytical", "creative", "fast", "legalExpert"). */
    name: z.string().min(1),
    /** User-friendly description. */
    description: z.string().optional(),
    /**
     * Ordered list of preferred models or model characteristics.
     * The framework will attempt to use the first suitable model found based on availability and other constraints.
     */
    modelPreferences: z.array(ModelPreferenceSchema).min(1),
    /** Optional constraints or defaults for LLM execution parameters. */
    parameterConstraints: z.object({
        minTemperature: z.number().min(0).max(2).optional(),
        maxTemperature: z.number().min(0).max(2).optional(),
        // Add constraints for maxTokens, topP, etc. if needed
        // Example: disallowStreaming: z.boolean().optional(),
    }).strict().optional(), // Be strict about defined constraints
    /** Specifies the memory context required/available for this profile. */
    memoryRequirements: MemoryRequirementSchema.optional().default({
        shortTerm: true,
        longTerm: false
    }),
    /** Optional: Other metadata. */
    metadata: z.record(z.unknown()).optional(),
});

// Define explicit type with required memoryRequirements
export interface IntelligenceProfile {
    name: string;
    description?: string;
    modelPreferences: (string | { capability?: string; minContextWindow?: number })[];
    parameterConstraints?: {
        minTemperature?: number;
        maxTemperature?: number;
    };
    memoryRequirements: {
        shortTerm: boolean;
        longTerm: false | {
            type: "vector" | "database" | "knowledge-graph";
            storeIdentifier?: string;
        };
    };
    metadata?: Record<string, unknown>;
}

// Schema for the root configuration file (e.g., intelligences.json)
export const IntelligencesConfigSchema = z.object({
    intelligences: z.array(
        IntelligenceProfileSchema.transform(profile => ({
            ...profile,
            memoryRequirements: profile.memoryRequirements || {
                shortTerm: true,
                longTerm: false
            }
        }))
    ).min(1),
    // Optional: Define a default intelligence profile?
    // defaultIntelligenceName: z.string().optional().refine(...)
});

// Explicit type with required properties
export interface IntelligencesConfig {
    intelligences: IntelligenceProfile[];
}
