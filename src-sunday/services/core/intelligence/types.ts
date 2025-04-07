/**
 * @file Defines interfaces, Tags, and types for the IntelligenceConfiguration service.
 */

import { Context, Effect, Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import type { Id, JsonObject } from "../../types.js";
import type { IntelligenceConfigurationError } from "./errors.js"; // Import specific errors
import type { IntelligenceProfile } from "./schema.js"; // Import schema type
// Import dependencies needed for R type
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../configuration/types.js";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";

// --- Service Interfaces & Tags ---

/** Service interface for accessing loaded Intelligence Profile definitions. */
export interface IntelligenceConfiguration {
  /** Retrieves a specific IntelligenceProfile by its unique name. */
  readonly getIntelligenceProfileByName: (
    name: string
  ) => Effect.Effect<IntelligenceProfile, IntelligenceConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>; // Requires ConfigLoader + deps

  /** Retrieves all loaded IntelligenceProfile definitions. */
  readonly listIntelligenceProfiles: () => Effect.Effect<ReadonlyArray<IntelligenceProfile>, IntelligenceConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>; // Requires ConfigLoader + deps

  // Optional: Method to get a default profile name if defined in config?
  // readonly getDefaultIntelligenceName: () => Effect.Effect<string | undefined, IntelligenceConfigurationError, ConfigLoaderApi | ...>;
}
/** Tag for the IntelligenceConfiguration service. */
export const IntelligenceConfiguration = Context.GenericTag<IntelligenceConfiguration>(
  "IntelligenceConfiguration"
);

// NOTE: There is no "IntelligenceApi" service. Intelligence is primarily a configuration entity
// used by other services (like SkillApi or ThreadApi) to make decisions about models,
// parameters, and memory access. This service only provides access to the definitions.
