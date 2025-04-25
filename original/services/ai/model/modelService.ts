// File: src/services/model/modelConfigurationService.ts (Complete - Branded Type Pattern)

import { Context, Effect, HashMap, Layer } from "effect";
// Import errors from this module
import { ModelConfigLoadError, ModelNotFoundError } from './errors.js';
// Import types inferred from this module's schema
import type { ModelCapability, ModelConfig, ModelConfigFile } from './schema.js';
// Import the INTERFACE and TAG from this module's types file
import { ModelConfigurationService } from './types.js';

// --- Service Tag for Config Data Dependency ---
// This Tag represents the dependency on the loaded ModelConfigFile object.
// It needs to be provided by a Layer during bootstrap.
export interface ModelConfigFileTag extends ModelConfigFile { }
export const ModelConfigFileTag = Context.GenericTag<ModelConfigFileTag>("ModelConfigFileTag");


// --- Service Implementation Object Factory ---
// This function creates the implementation object based on the loaded config.
// The return type matches the public interface ModelConfigurationService.
const makeModelConfigurationService = (
	modelConfigFile: ModelConfigFile
): ModelConfigurationService => {

	// --- Input Validation ---
	if (!modelConfigFile || !Array.isArray(modelConfigFile.models)) {
		// Throw immediately during creation - Layer construction will fail cleanly.
		throw new ModelConfigLoadError({ message: "Invalid or missing ModelConfigFile provided to makeModelConfigurationService." });
	}

	// --- Build Internal State (Maps/Lists) ---
	// This state is captured in the closure of the returned methods.
	let modelsMap = HashMap.empty<string, ModelConfig>();
	const tempList: ModelConfig[] = [];
	modelConfigFile.models.forEach((model: ModelConfig) => { // Explicit type hint
		const modelId = model.id;
		if (HashMap.has(modelsMap, modelId)) {
			// Log warning for duplicates
			console.warn(`[ModelConfigurationService] Duplicate model ID found in configuration: ${modelId}. Using first occurrence.`);
		} else {
			modelsMap = HashMap.set(modelsMap, modelId, model);
			tempList.push(model);
		}
	});
	// Final immutable list/map captured by the closure
	const finalModelsMap = modelsMap;
	const modelList: ReadonlyArray<ModelConfig> = Object.freeze([...tempList]);

	// Log initialization (consider using Effect.log in the Layer if preferred)
	console.log(`[ModelConfigurationService] Service instance created with ${HashMap.size(finalModelsMap)} unique models.`);

	// --- Return the implementation object literal ---
	return {
		// No brand property ([ModelConfigurationServiceBrand]) needed here

		getModelConfig: (modelId: string): Effect.Effect<ModelConfig, ModelNotFoundError> => {
			// Access the 'finalModelsMap' captured in the closure
			return Effect.sync(() => HashMap.get(finalModelsMap, modelId)).pipe(
				Effect.flatMap(maybeModel =>
					maybeModel._tag === "Some"
						? Effect.succeed(maybeModel.value)
						: Effect.fail(new ModelNotFoundError({ modelId }))
				)
			);
		},

		listModels: () => Effect.sync(() => modelList),

		findModelsByCapability: (
			capabilities: ReadonlyArray<ModelCapability>,
			matchAll: boolean = false
		): Effect.Effect<ReadonlyArray<ModelConfig>> => {
			// Access the 'modelList' captured in the closure
			return Effect.sync(() => {
				if (!capabilities || capabilities.length === 0) { return []; }
				// Use native filter on captured list
				return modelList.filter(model => {
					const modelCaps = new Set(model.capabilities);
					if (matchAll) { return capabilities.every(cap => modelCaps.has(cap)); }
					else { return capabilities.some(cap => modelCaps.has(cap)); }
				});
			});
		}
	}; // End of returned implementation object
};


// --- Service Layer Definition ---
/**
 * Live Layer for the ModelConfigurationService.
 * Requires ModelConfigFileTag in its context to get the loaded config data.
 */
export const ModelConfigurationServiceLive = Layer.effect(
	ModelConfigurationService, // Provide the public Tag
	// Use Effect.map to get the config file via its Tag from the context
	// and call the factory function to create the service implementation object.
	Effect.map(
		ModelConfigFileTag, // Dependency needed from context
		(configFile) => makeModelConfigurationService(configFile) // Create the implementation
	)
);

// --- Example Layer for providing the config file itself ---
/*
import { ConfigLoader } from "../configuration/configurationLoader.js"; // Adjust path
import { ModelConfigFileSchema } from "./schema.js"; // Adjust path
import type { ConfigurationError } from '../configuration/errors.js'; // Adjust path
import type { AgentConfig } from "../../../agents/agent-service/types.js"; // Adjust path
import type { ConfigReadError, ConfigParseError, ConfigValidationError, ConfigSchemaMissingError } from '../configuration/errors.js'; // Adjust path

// Effect to load the config file using ConfigLoader service
export const loadModelConfigFile = (agentConfig: AgentConfig): Effect.Effect<
	ModelConfigFile,
	ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, // Errors from ConfigLoader
	ConfigLoader // Requires ConfigLoader service
> => Effect.flatMap(ConfigLoader, loader => // Get ConfigLoader from context
	loader.loadConfig<ModelConfigFile>( // Call loadConfig
		agentConfig.configFiles.models,
		{ schema: ModelConfigFileSchema }
	).pipe(
		Effect.map(config => config as ModelConfigFile) // Cast BaseConfig result
	)
);

// Layer that loads the config and provides it via ModelConfigFileTag
export const ModelConfigFileLive = (agentConfig: AgentConfig) => Layer.effect(
	ModelConfigFileTag,
	loadModelConfigFile(agentConfig) // This Effect requires ConfigLoader in its context
);

// Example Composition in bootstrap:
// const agentConfigLayer = Layer.succeed(AgentConfigTag, myAgentConfig);
// const configLoaderLayer = ConfigLoaderLive; // Needs its own dependencies provided (Options, Platform)
// const modelConfigFileLayer = Layer.provide(
//      ModelConfigFileLive(myAgentConfig),
//      configLoaderLayer // Provide ConfigLoader to ModelConfigFileLive
// );
// const modelConfigServiceLayer = Layer.provide(
//      ModelConfigurationServiceLive,
//      modelConfigFileLayer // Provide ModelConfigFileTag to ModelConfigurationServiceLive
// );
*/
