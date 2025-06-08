import { ModelCapability } from "@/schema.js";
import { PROVIDER_NAMES } from "../provider/provider-universe.js";
import { ModelCapabilityDetail } from "./schema.js";
/**
 * Canonical list of all models supported by the ModelService.
 *
 * This is the single source of truth for model metadata, configuration, and capabilities.
 *
 * To add a new model, add a new entry to this array and update ModelMetadata if needed.
 * This file is used by the ModelService to look up model information.
 */
export interface ModelMetadata {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly provider: typeof PROVIDER_NAMES[number];
    readonly modelName: string;
    readonly displayName: string;
    readonly description?: string;
    readonly vendorCapabilities: readonly ModelCapability[];
    readonly derivedProficiencies?: readonly ModelCapabilityDetail[];
    readonly contextWindowSize?: number;
    readonly maxTokens?: number;
    readonly temperature?: number;
    readonly costPer1kInputTokens?: number;
    readonly costPer1kOutputTokens?: number;
    readonly supportedLanguages?: readonly string[];
    readonly responseFormat?: {
        readonly type: "text" | "image" | "audio" | "embedding";
        readonly supportedFormats: readonly string[];
    };
    readonly thinkingBudget?: number;
    readonly enabled: boolean;
}
export declare const MODEL_UNIVERSE: readonly ModelMetadata[];
/**
 * Canonical tuple of model IDs derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export declare const MODEL_IDS: readonly string[];
//# sourceMappingURL=model-universe.d.ts.map