/**
 * @file Implements the Layer for loading static Intelligence definitions using effect/Config.
 * @module services/capabilities/intelligence/data
 */

import { Config, ConfigProvider, Data, Effect, HashMap, Layer, Schema } from "effect";
// Import specific error types needed for mapping
import { EntityParseError } from "@/services/core/errors.js"; // Assuming a core error type
import { IntelligenceConfigError } from "./errors.js"; // The specific error for this module
import {
	IntelligencesConfigFileSchema,
	IntelligenceDefinition,
	// IntelligenceName is defined in types.ts
} from "./schema.js";
import {
	IntelligenceData,
	IntelligenceDataTag,
	IntelligenceName, // Import name type
} from "./types.js";
// No need for FileSystem, PlatformError, ConfigError imports with this pattern

// Define the Config key for the intelligence definitions
// Assumes the ConfigProvider is set up to resolve this key (e.g., from env var, file)
const intelligencesConfigKey = Config.string("intelligences");

/**
 * Live Layer that loads static intelligence definitions using Effect's Config system,
 * validates them against the schema, transforms the data into a HashMap,
 * and provides it via IntelligenceDataTag.
 *
 * Requires ConfigProvider.
 */
export const IntelligenceDataLiveLayer = Layer.effect(
	IntelligenceDataTag,
	Effect.gen(function* () {
		// 1. Get ConfigProvider and load raw config string
		const configProvider = yield* ConfigProvider.ConfigProvider;
		// Load the raw JSON string associated with the 'intelligences' config key
		const rawConfigString = yield* configProvider.load(intelligencesConfigKey).pipe(
			Effect.mapError(
				(cause) => // cause here is likely ConfigError
					new IntelligenceConfigError({
						message: "Failed to load intelligences configuration source",
						// Wrap the ConfigError in EntityParseError for consistency? Or define specific LoadError?
						// Using EntityParseError for now based on provider example pattern
						cause: new EntityParseError({
							filePath: "intelligences config source", // Indicate source isn't necessarily a file
							cause,
						}),
					}),
			),
		);

		// 2. Parse the JSON string with proper error handling
		const parsedConfig = yield* Effect.try({
			try: () => JSON.parse(rawConfigString),
			catch: (error) => new IntelligenceConfigError({
				message: "Failed to parse intelligences configuration JSON",
				cause: error
			})
		})

		// 3. Validate the parsed config using the schema
		const validConfig = yield* Schema.decode(IntelligencesConfigFileSchema)(
			parsedConfig,
		).pipe(
			Effect.mapError(
				(cause) => // cause here is ParseError
					new IntelligenceConfigError({
						message: "Failed to validate intelligences configuration structure",
						cause: cause,
					}),
			),
		);

		// 4. Transform to HashMap for efficient lookup
		const intelligenceEntries: ReadonlyArray<
			readonly [IntelligenceName, IntelligenceDefinition]
		> = validConfig.intelligences.map(
			(def: IntelligenceDefinition) => [def.name, def] as const,
		);
		const intelligencesMap = HashMap.fromIterable(intelligenceEntries);

		// 5. Return typed IntelligenceData
		return new IntelligenceData({ intelligences: intelligencesMap });
	}),
);
