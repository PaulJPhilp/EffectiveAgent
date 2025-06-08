/**
 * Canonical list of all providers supported by the ProviderService.
 *
 * This is the single source of truth for provider metadata, configuration, and capabilities.
 *
 * To add a new provider, add a new entry to this array and update ProviderMetadata if needed.
 * This file is private to the ProviderService and not exported elsewhere.
 */
import type { ProviderMetadata } from "./types.js";
export declare const PROVIDER_UNIVERSE: readonly ProviderMetadata[];
/**
 * Canonical tuple of provider names derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export declare const PROVIDER_NAMES: readonly string[];
//# sourceMappingURL=provider-universe.d.ts.map