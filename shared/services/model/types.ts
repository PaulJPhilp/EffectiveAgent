import type { ModelCapability, ThinkingLevel } from "./schemas/modelConfig.js";
import type { ModelConfig } from "./schemas/modelRegistry.js";

/**
 * Model identifier
 */
export interface ModelIdentifier {
	readonly modelId: string;
}

/**
 * Model selection requirements
 */
export interface ModelSelectionRequirements {
	capabilities: ModelCapability[]
	thinkingLevel?: ThinkingLevel
	contextWindowSize?: number
	preferredModelId?: string
}

/**
 * Result of model selection
 */
export interface ModelSelectionResult {
	model: ModelConfig
}

/**
 * Interface for model selection service
 */
export interface IModelSelectionService {
	getModelById(modelId: string): ModelConfig
	getAllModels(): ModelConfig[]
	getModelsWithCapability(capability: ModelCapability): ModelConfig[]
} 
