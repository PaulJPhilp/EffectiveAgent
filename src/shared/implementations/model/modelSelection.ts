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

    public selectModel(requirements: ModelSelectionRequirements): ModelSelectionResult {
        const candidates = this.models.filter(model => {
            // Check if model has all required capabilities
            const hasCapabilities = requirements.capabilities.every(cap =>
                model.capabilities.includes(cap)
            )

            // Check context window size if specified
            const hasContextWindow = !requirements.contextWindowSize ||
                (model.contextWindow ?? 0) >= requirements.contextWindowSize

            // Check thinking level if specified
            const hasThinkingLevel = !requirements.thinkingLevel ||
                (model.thinkingLevel ?? 'low') >= requirements.thinkingLevel

            return hasCapabilities && hasContextWindow && hasThinkingLevel
        })

        if (candidates.length === 0) {
            throw new Error("No model found matching the requirements")
        }

        // If preferred model is specified and available, use it
        if (requirements.preferredModelId) {
            const preferredModel = candidates.find(m => m.id === requirements.preferredModelId)
            if (preferredModel) {
                return {
                    model: preferredModel,
                    confidence: 1.0
                }
            }
        }

        // Sort candidates by capability match and context window size
        candidates.sort((a, b) => {
            // More capabilities is better
            const capDiff = b.capabilities.length - a.capabilities.length
            if (capDiff !== 0) return capDiff

            // Larger context window is better
            return (b.contextWindow ?? 0) - (a.contextWindow ?? 0)
        })

        // Calculate confidence based on how well the model matches requirements
        const confidence = this.calculateConfidence(candidates[0], requirements)

        return {
            model: candidates[0],
            confidence
        }
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