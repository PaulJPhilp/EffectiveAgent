
import type {
	JSONValue,
	ModelCompletionOptions,
	ModelCompletionResponse
} from '@/types.ts';
import type { ModelConfig, ModelConfigFile, ModelsConfig } from './schemas/modelConfig.js';

export interface ModelServiceConfig {
	debug?: boolean
	configPath: string
	environment?: string
}

export interface IModelService {
	/**	
	 * Generate text using the specified options
	 */
	generateText(
		options: ModelCompletionOptions
	): Promise<ModelCompletionResponse>

	generateObject<T extends JSONValue = JSONValue>(
		options: ModelCompletionOptions<T>	
	): Promise<ModelCompletionResponse>

	generateEmbedding(
		options: ModelCompletionOptions
	): Promise<ModelCompletionResponse>

	generateImage(
		options: ModelCompletionOptions
	): Promise<ModelCompletionResponse>
} 

export type { ModelConfig, ModelConfigFile, ModelsConfig } 
