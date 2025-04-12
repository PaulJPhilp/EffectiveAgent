/**
 * @file Implements the Layer for loading static Skill definitions using effect/Config.
 * @module services/capabilities/skill/data
 */

import { Config, ConfigProvider, Data, Effect, HashMap, Layer, Schema, Option, Context } from "effect";
// Import specific error types needed for mapping
import { EntityParseError } from "@/services/core/errors.js"; // Assuming a core error type
import { SkillConfigError } from "./errors.js"; // Skill specific errors
import {
	SkillsConfigFileSchema,
	SkillDefinition, // Import base definition type
} from "./schema.js";
import {
	SkillData,
	SkillDataTag,
	RegisteredSkill, // Import the runtime structure
	SkillServiceTag, // Need SkillService to validate definitions
} from "./types.js";
import type { ConfigError } from "effect/ConfigError";
import type { ParseError } from "effect/ParseResult";

// --- Placeholder Schema Registry ---
// TODO: Replace with a more robust mechanism if needed (e.g., dedicated service)
// Maps string references from skill definitions to actual Schema objects.
// Schemas should be defined and exported elsewhere (e.g., common schemas module or alongside implementations)
// Example Schemas (Assume these are imported):
const GenericTextInputSchema = Schema.Struct({ text: Schema.String });
const GenericJsonOutputSchema = Schema.Record(Schema.String, Schema.Unknown); // Allows any JSON object
const AnyInputSchema = Schema.Any; // Allows any input (use with caution)
const StringOutputSchema = Schema.String; // Expects a string output

const schemaRegistry: Record<string, Schema.Schema<any>> = {
	"genericTextInput": GenericTextInputSchema,
	"genericJsonOutput": GenericJsonOutputSchema,
	"anyInput": AnyInputSchema,
	"stringOutput": StringOutputSchema,
	// Add schemas for calculator, hackernews, etc.
	"calculatorInput": Schema.Struct({ expression: Schema.String }), // Example
	"calculatorOutput": Schema.Struct({ result: Schema.Number }), // Example
};

const defaultInputSchema = AnyInputSchema;
const defaultOutputSchema = Schema.Unknown; // Allow any output if not specified

// --- Config Key ---
const skillsConfigKey = Config.string("skills"); // Key for skills JSON string/path

/**
 * Live Layer that loads static skill definitions using Effect's Config system,
 * validates them (including resolving schema references), and provides the
 * processed data via SkillDataTag.
 *
 * Requires ConfigProvider and SkillServiceTag.
 */
export const SkillDataLiveLayer = Layer.effect(
	SkillDataTag,
	Effect.gen(function* () {
		const configProvider = yield* ConfigProvider.ConfigProvider;
		const skillService = yield* SkillServiceTag; // For validating SkillDefinition part

		// 1. Load raw config string
		const rawConfigString = yield* configProvider.load(skillsConfigKey).pipe(
			Effect.mapError(
				(cause) => new SkillConfigError({
					message: "Failed to load skills configuration source",
					cause: new EntityParseError({ filePath: "skills config source", cause }),
				}),
			),
		);

		// 2. Parse JSON string
		const parsedConfig = yield* Effect.try({
			try: () => JSON.parse(rawConfigString),
			catch: (unknown) => new SkillConfigError({
				message: "Failed to parse JSON from skills configuration source",
				cause: unknown,
			}),
		});

		// 3. Validate overall file structure
		const configFile = yield* Schema.decodeUnknown(SkillsConfigFileSchema)(parsedConfig).pipe(
			Effect.mapError(
				(cause) => new SkillConfigError({
					message: "Invalid file structure in skills configuration",
					cause: new EntityParseError({ filePath: "skills config source", cause }),
				}),
			),
		);

		// 4. Process and validate each skill definition
		const registeredSkillsResult = yield* Effect.forEach(
			configFile.skills,
			(rawDefinition) => Effect.gen(function* () {
				// 4a. Validate the core definition using SkillService.make
				const validatedDefinition = yield* skillService.make(rawDefinition);

				// 4b. Resolve Input Schema
				const inputSchemaRef = validatedDefinition.inputSchemaRef;
				const inputSchema = inputSchemaRef && schemaRegistry[inputSchemaRef]
					? schemaRegistry[inputSchemaRef]
					: defaultInputSchema;
				if (inputSchemaRef && !schemaRegistry[inputSchemaRef]) {
					yield* Effect.logWarning(`Input schema ref "${inputSchemaRef}" not found for skill "${validatedDefinition.name}". Using default.`);
				}

				// 4c. Resolve Output Schema
				const outputSchemaRef = validatedDefinition.outputSchemaRef;
				const outputSchema = outputSchemaRef && schemaRegistry[outputSchemaRef]
					? schemaRegistry[outputSchemaRef]
					: defaultOutputSchema;
				if (outputSchemaRef && !schemaRegistry[outputSchemaRef]) {
					yield* Effect.logWarning(`Output schema ref "${outputSchemaRef}" not found for skill "${validatedDefinition.name}". Using default.`);
				}

				// 4d. Create RegisteredSkill object
				const registeredSkill: RegisteredSkill = {
					definition: validatedDefinition,
					inputSchema: inputSchema,
					outputSchema: outputSchema,
				};
				return registeredSkill;
			}),
			{ concurrency: "inherit" }
		).pipe(
			// If any validation/resolution fails, wrap error
			Effect.mapError(cause => {
				// Cause could be SkillConfigError from skillService.make or others
				if (cause instanceof SkillConfigError) return cause;
				// Wrap other unexpected errors
				return new SkillConfigError({ message: "Failed to process skill definitions", cause });
			})
		);

		// 5. Create the HashMap
		const skillsMap: HashMap.HashMap<SkillName, RegisteredSkill> = HashMap.fromIterable(
			registeredSkillsResult.map(rs => [rs.definition.name, rs])
		);

		// 6. Create and return the SkillData
		return new SkillData({ skills: skillsMap });
	}),
);
