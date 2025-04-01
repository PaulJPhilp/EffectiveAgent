// File: src/services/model/modelConfigurationService.ts (Removed RA Alias Usage)

// REMOVED ReadonlyArray alias from import
import { Context, Effect, HashMap, Layer } from "effect";
import { ModelConfigFileSchema } from "../../config-master/types/model-config.js";
import { ModelConfigLoadError, ModelNotFoundError } from './errors.js';
import type { ModelCapability, ModelConfig, ModelConfigFile } from './schema.js';
import { ModelConfigurationService } from './types.js';

// --- Service Tag for Config Data Dependency ---
export interface ModelConfigFileTag extends ModelConfigFile { }
export const ModelConfigFileTag = Context.GenericTag<ModelConfigFileTag>("ModelConfigFileTag");


// --- Service Implementation Object Factory ---
const makeModelConfigurationService = (
	modelConfigFile: ModelConfigFile
): ModelConfigurationService => {
	// Validate config file against schema
	const parseResult = ModelConfigFileSchema.safeParse(modelConfigFile);
	if (!parseResult.success) {
		throw new ModelConfigLoadError({
			message: "Invalid model configuration file",
			cause: parseResult.error
		});
	}

	// Build internal state
	let modelsMap = HashMap.empty<string, ModelConfig>();
	const tempList: ModelConfig[] = [];

	modelConfigFile.models.forEach((model: ModelConfig) => {
		const modelId = model.id;
		if (HashMap.has(modelsMap, modelId)) {
			console.warn(`[ModelConfigurationService] Duplicate model ID found: ${modelId}. Using first occurrence.`);
		} else {
			modelsMap = HashMap.set(modelsMap, modelId, model);
			tempList.push(model);
		}
	});

	// Create immutable state
	const finalModelsMap = modelsMap;
	const modelList: ReadonlyArray<ModelConfig> = Object.freeze([...tempList]);

	console.log(`[ModelConfigurationService] Service instance created with ${HashMap.size(finalModelsMap)} unique models.`);

	return {
		getModelConfig: (modelId: string): Effect.Effect<ModelConfig, ModelNotFoundError> =>
			Effect.sync(() => HashMap.get(finalModelsMap, modelId)).pipe(
				Effect.flatMap(maybeModel =>
					maybeModel._tag === "Some"
						? Effect.succeed(maybeModel.value)
						: Effect.fail(new ModelNotFoundError({ modelId }))
				)
			),

		listModels: () => Effect.sync(() => modelList),

		findModelsByCapability: (
			capabilities: ReadonlyArray<ModelCapability>,
			matchAll = false
		): Effect.Effect<ReadonlyArray<ModelConfig>, never> =>
			Effect.sync(() => {
				if (!capabilities || capabilities.length === 0) return [];
				return modelList.filter(model => {
					const modelCaps = new Set(model.capabilities);
					return matchAll
						? capabilities.every(cap => modelCaps.has(cap))
						: capabilities.some(cap => modelCaps.has(cap));
				});
			})
	};
};

// --- Service Layer Definition ---
export const ModelConfigurationServiceLive = Layer.effect(
	ModelConfigurationService,
	Effect.gen(function* () {
		const configFile = yield* ModelConfigFileTag;
		return makeModelConfigurationService(configFile);
	})
);
