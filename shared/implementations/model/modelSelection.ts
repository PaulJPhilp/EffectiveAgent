import type {
    IModelSelectionService,
    ModelSelectionRequirements,
    ModelSelectionResult
} from "../../interfaces/model.js"
import type { ModelCapability } from "../../schemas/modelConfig.js"
import type { ModelConfig } from "../../schemas/modelRegistry.js"

export class ModelSelectionService implements IModelSelectionService {
    private models: ModelConfig[]

    constructor(models: ModelConfig[]) {
        this.models = models
    }

    /**
     * Select the best model based on requirements
     */
    public selectModel(requirements: ModelSelectionRequirements): ModelSelectionResult {
        // Filter models based on required capabilities
        let candidateModels = this.models.filter(model => {
            return requirements.capabilities.every(cap => 
                model.capabilities?.includes(cap) || false
            )
        })
        
        // Filter based on thinking level if required
        if (requirements.thinkingLevel) {
            candidateModels = candidateModels.filter(model => 
                (model.thinkingLevel || 'low') >= requirements.thinkingLevel!
            )
        }
        
        // Filter based on context window size if required
        if (requirements.contextWindowSize) {
            candidateModels = candidateModels.filter(model => 
                (model.contextWindow || 0) >= requirements.contextWindowSize!
            )
        }
        
        // Use preferred model if specified and available
        if (requirements.preferredModelId) {
            const preferredModel = candidateModels.find(model => 
                model.id === requirements.preferredModelId
            )
            
            if (preferredModel) {
                return {
                    model: preferredModel,
                    confidence: 1.0
                }
            }
        }
        
        // Sort models by confidence score
        const scoredModels = candidateModels.map(model => ({
            model,
            confidence: this.calculateConfidence(model, requirements)
        }))
        
        scoredModels.sort((a, b) => b.confidence - a.confidence)
        
        if (scoredModels.length === 0) {
            throw new Error(`No models found matching requirements: ${
                JSON.stringify(requirements)
            }`)
        }
        
        return scoredModels[0]
    }

    public getModelById(modelId: string): ModelConfig {
        const model = this.models.find(m => m.id === modelId)
        if (!model) {
            throw new Error(`Model with ID ${modelId} not found`)
        }
        return model
    }

    public getAllModels(): ModelConfig[] {
        return [...this.models]
    }

    public getModelsWithCapability(capability: ModelCapability): ModelConfig[] {
        return this.models.filter(model => model.capabilities.includes(capability))
    }

    private calculateConfidence(model: ModelConfig, requirements: ModelSelectionRequirements): number {
        let confidence = 1.0

        // Reduce confidence if model has more capabilities than required
        const extraCapabilities = model.capabilities.length - requirements.capabilities.length
        if (extraCapabilities > 0) {
            confidence *= (1 - 0.1 * extraCapabilities)
        }

        // Reduce confidence if context window is much larger than required
        if (requirements.contextWindowSize && (model.contextWindow ?? 0) > requirements.contextWindowSize * 2) {
            confidence *= 0.9
        }

        // Reduce confidence if thinking level is higher than required
        if (requirements.thinkingLevel && (model.thinkingLevel ?? 'low') > requirements.thinkingLevel) {
            confidence *= 0.9
        }

        return Math.max(0.1, confidence)
    }
} 