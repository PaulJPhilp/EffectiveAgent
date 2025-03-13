import dotenv from "dotenv";
import type { ModelCapability } from "./shared/schemas/modelConfig.js";
import type { ModelConfig } from "./shared/schemas/modelRegistry.js";
import {
    ModelRegistryService,
    ModelSelectionFactory,
    ModelService
} from "./shared/services/model/index.js";
import { ProviderFactory } from "./shared/services/provider/providerFactory.js";

// Load environment variables
dotenv.config();

// Helper function to calculate cost
function calculateCost(model: ModelConfig, tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number }): string {
    if (!model.costPer1kTokens || !tokenUsage?.totalTokens) return 'Cost: unknown';
    const cost = (tokenUsage.totalTokens / 1000) * model.costPer1kTokens;
    return `Cost: $${cost.toFixed(4)}`;
}

async function testModelService() {
    try {
        console.log("Initializing model registry...");
        const registryService = new ModelRegistryService();
        await registryService.initialize();

        console.log("Initializing model selection factory...");
        const modelSelectionFactory = await ModelSelectionFactory.getInstance();

        console.log("Initializing model provider factory...");
        const providerFactory = await ProviderFactory.getInstance();

        console.log("Initializing model service...");
        const modelService = await ModelService.getInstance();

        // Helper function to check if a model has a specific capability
        function modelHasCapability(
            modelId: string,
            capability: ModelCapability,
        ): boolean {
            try {
                const model = modelSelectionFactory.getModelById(modelId);
                return model.capabilities.includes(capability);
            } catch (error) {
                console.warn(
                    `Could not check capabilities for model ${modelId}: ${error}`,
                );
                return false;
            }
        }

        // Test task-based model completion with default task temperature (OpenAI)
        console.log(
            "\nTesting task-based model completion (clustering - OpenAI) with task temperature...",
        );
        const clusteringResponse = await modelService.completeWithModel(
            "clustering",
            {
                prompt: "Explain what clustering is in data science in 2-3 sentences.",
                systemPrompt:
                    "You are a helpful AI assistant that provides concise explanations.",
            },
        );

        console.log("Response from clustering task model:");
        console.log(clusteringResponse.text);
        console.log("Token usage:", clusteringResponse.usage);
        if (typeof clusteringResponse.modelId === 'string') {
            const clusteringModel = modelSelectionFactory.getModelById(clusteringResponse.modelId);
            console.log(calculateCost(clusteringModel, clusteringResponse.usage));
        } else {
            console.log("Cost: unknown (model ID not provided)");
        }

        // Test task-based model completion with override temperature (Anthropic)
        console.log(
            "\nTesting task-based model completion (analysis - Anthropic) with override temperature...",
        );
        const analysisResponse = await modelService.completeWithModel(
            "analysis",
            {
                prompt: "Explain what sentiment analysis is in NLP in 2-3 sentences.",
                systemPrompt:
                    "You are a helpful AI assistant that provides concise explanations.",
                temperature: 0.8, // Override the task temperature
            },
        );

        console.log(
            "Response from analysis task model (with override temperature):",
        );
        console.log(analysisResponse.text);
        console.log("Token usage:", analysisResponse.usage);
        if (typeof analysisResponse.modelId === 'string') {
            const analysisModel = modelSelectionFactory.getModelById(analysisResponse.modelId);
            console.log(calculateCost(analysisModel, analysisResponse.usage));
        } else {
            console.log("Cost: unknown (model ID not provided)");
        }

        // Test reasoning capability with thinking level
        console.log('\nTesting reasoning capability with thinking levels...');

        // Check available reasoning models
        console.log('\nAvailable reasoning models:');
        const allModels = modelSelectionFactory.getAllModels();
        const reasoningModels = allModels.filter(model =>
            model.capabilities.includes("reasoning")
        );
        for (const model of reasoningModels) {
            console.log(`- ${model.id} (${model.provider}): thinking level ${model.thinkingLevel || 'unknown'}`);
        }

        // Test with low thinking level
        console.log('\nTesting reasoning with LOW thinking level:');
        try {
            const lowThinkingResponse = await modelService.completeWithThinkingLevel(
                {
                    prompt: 'What is 15 + 27?',
                    systemPrompt: 'You are a helpful AI assistant that solves math problems step by step.'
                },
                'low'
            );

            console.log('Response from low thinking level:');
            console.log(lowThinkingResponse.text);
            console.log('Token usage:', lowThinkingResponse.usage);
            if (typeof lowThinkingResponse.modelId === 'string') {
                const lowThinkingModel = modelSelectionFactory.getModelById(lowThinkingResponse.modelId);
                console.log(calculateCost(lowThinkingModel, lowThinkingResponse.usage));
            } else {
                console.log("Cost: unknown (model ID not provided)");
            }
        } catch (error) {
            console.log('Low thinking level test failed:');
            console.error(error);
        }

        // Test with medium thinking level
        console.log('\nTesting reasoning with MEDIUM thinking level:');
        try {
            const mediumThinkingResponse = await modelService.completeWithThinkingLevel(
                {
                    prompt: 'If a train travels at 60 mph and another train travels at 75 mph in the opposite direction, how long will it take for them to be 270 miles apart if they start at the same location?',
                    systemPrompt: 'You are a helpful AI assistant that solves math problems step by step.'
                },
                'medium'
            );

            console.log('Response from medium thinking level:');
            console.log(mediumThinkingResponse.text);
            console.log('Token usage:', mediumThinkingResponse.usage);
            if (typeof mediumThinkingResponse.modelId === 'string') {
                const mediumThinkingModel = modelSelectionFactory.getModelById(mediumThinkingResponse.modelId);
                console.log(calculateCost(mediumThinkingModel, mediumThinkingResponse.usage));
            } else {
                console.log("Cost: unknown (model ID not provided)");
            }
        } catch (error) {
            console.log('Medium thinking level test failed:');
            console.error(error);
        }

        // Test with high thinking level
        console.log('\nTesting reasoning with HIGH thinking level:');
        try {
            const highThinkingResponse = await modelService.completeWithThinkingLevel(
                {
                    prompt: 'A farmer needs to take a fox, a chicken, and a sack of grain across a river. The boat is only big enough for the farmer and one item. If left alone, the fox will eat the chicken, and the chicken will eat the grain. How can the farmer get all three across safely?',
                    systemPrompt: 'You are a helpful AI assistant that solves logical puzzles step by step.'
                },
                'high'
            );

            console.log('Response from high thinking level:');
            console.log(highThinkingResponse.text);
            console.log('Token usage:', highThinkingResponse.usage);
            if (typeof highThinkingResponse.modelId === 'string') {
                const highThinkingModel = modelSelectionFactory.getModelById(highThinkingResponse.modelId);
                console.log(calculateCost(highThinkingModel, highThinkingResponse.usage));
            } else {
                console.log("Cost: unknown (model ID not provided)");
            }
        } catch (error) {
            console.log('High thinking level test failed:');
            console.error(error);
        }

        // Test with OpenAI reasoning model (o1-mini)
        console.log('\nTesting reasoning with OpenAI o1-mini model:');
        try {
            const o1MiniResponse = await modelService.completeWithModel(
                'o1-mini',
                {
                    prompt: 'If a rectangle has a length of 10 units and a width of 5 units, what is its area and perimeter?',
                    systemPrompt: 'You are a helpful AI assistant that solves math problems step by step.'
                }
            );

            console.log('Response from o1-mini:');
            console.log(o1MiniResponse.text);
            console.log('Token usage:', o1MiniResponse.usage);
            const o1MiniModel = modelSelectionFactory.getModelById('o1-mini');
            console.log(calculateCost(o1MiniModel, o1MiniResponse.usage));
        } catch (error) {
            console.log('o1-mini reasoning test failed:');
            console.error(error);
        }

        // Test task-specific reasoning with thinking level
        console.log('\nTesting task-specific reasoning with thinking level:');
        try {
            const reasoningTaskResponse = await modelService.completeWithThinkingLevel(
                {
                    prompt: 'In a certain town, 1/5 of all households own a dog, 1/3 own a cat, and 1/10 own both a dog and a cat. What fraction of households own either a dog or a cat?',
                    systemPrompt: 'You are a helpful AI assistant that solves math problems step by step.'
                },
                'high'
            );

            console.log('Response from task-specific reasoning with high thinking level:');
            console.log(reasoningTaskResponse.text);
            console.log('Token usage:', reasoningTaskResponse.usage);
            if (typeof reasoningTaskResponse.modelId === 'string') {
                const reasoningModel = modelSelectionFactory.getModelById(reasoningTaskResponse.modelId);
                console.log(calculateCost(reasoningModel, reasoningTaskResponse.usage));
            } else {
                console.log("Cost: unknown (model ID not provided)");
            }
        } catch (error) {
            console.log('Task-specific reasoning test failed:');
            console.error(error);
        }

        // Test text-to-image capability
        console.log('\nTesting text-to-image capability...');
        if (modelHasCapability('dall-e-3', 'text-to-image')) {
            try {
                const imageResponse = await modelService.generateImage(
                    {
                        prompt: 'A serene landscape with mountains, a lake, and a small cabin in the foreground, digital art style',
                    }
                );

                console.log('Response from image generation task:');
                console.log('Image URLs:', imageResponse.images);
                console.log('Token usage:', imageResponse.usage);
            } catch (error) {
                console.log('Image generation test failed - this may require a specialized provider implementation');
                console.error(error);
            }
        } else {
            console.log('Skipping text-to-image test - no model with text-to-image capability available');
        }

        // Test embeddings capability
        console.log('\nTesting embeddings capability...');
        if (modelHasCapability('embedding-ada-002', 'embeddings')) {
            try {
                const embeddingResponse = await modelService.generateEmbedding(
                    {
                        input: 'The quick brown fox jumps over the lazy dog',
                    }
                );

                console.log('Response from embeddings task:');
                console.log(`Embedding vector length: ${embeddingResponse.embeddings[0]?.length || 0}`);
                console.log('Token usage:', embeddingResponse.usage);
            } catch (error) {
                console.log('Embeddings test failed - this may require a specialized provider implementation');
                console.error(error);
            }
        } else {
            console.log('Skipping embeddings test - no model with embeddings capability available');
        }

        // Test task-based model completion (Google)
        console.log(
            "\nTesting task-based model completion (summarization - Google)...",
        );
        const summarizationResponse = await modelService.completeWithModel(
            "summarization",
            {
                prompt: "Explain what text summarization is in NLP in 2-3 sentences.",
                systemPrompt:
                    "You are a helpful AI assistant that provides concise explanations.",
            },
        );

        console.log("Response from summarization task model:");
        console.log(summarizationResponse.text);
        console.log("Token usage:", summarizationResponse.usage);
        if (typeof summarizationResponse.modelId === 'string') {
            const summarizationModel = modelSelectionFactory.getModelById(summarizationResponse.modelId);
            console.log(calculateCost(summarizationModel, summarizationResponse.usage));
        } else {
            console.log("Cost: unknown (model ID not provided)");
        }

        // Test model-specific completion (OpenAI)
        console.log("\nTesting model-specific completion (gpt-3.5-turbo)...");
        const openaiModelResponse = await modelService.completeWithModel(
            "gpt-3.5-turbo",
            {
                prompt:
                    "What are the benefits of using TypeScript over JavaScript? Answer in 2-3 sentences.",
                systemPrompt:
                    "You are a helpful AI assistant that provides concise explanations.",
                temperature: 0.5, // Explicitly set temperature
            },
        );

        console.log("Response from OpenAI model:");
        console.log(openaiModelResponse.text);
        console.log("Token usage:", openaiModelResponse.usage);
        const gpt35Model = modelSelectionFactory.getModelById('gpt-3.5-turbo');
        console.log(calculateCost(gpt35Model, openaiModelResponse.usage));

        // Test model-specific completion (Anthropic)
        console.log("\nTesting model-specific completion (claude-3-haiku)...");
        const anthropicModelResponse = await modelService.completeWithModel(
            "claude-3-haiku",
            {
                prompt:
                    "What are the benefits of functional programming? Answer in 2-3 sentences.",
                systemPrompt:
                    "You are a helpful AI assistant that provides concise explanations.",
            },
        );

        console.log("Response from Anthropic model:");
        console.log(anthropicModelResponse.text);
        console.log("Token usage:", anthropicModelResponse.usage);
        const claudeHaikuModel = modelSelectionFactory.getModelById('claude-3-haiku');
        console.log(calculateCost(claudeHaikuModel, anthropicModelResponse.usage));

        // Test model-specific completion (Google)
        console.log("\nTesting model-specific completion (gemini-pro)...");
        const googleModelResponse = await modelService.completeWithModel(
            "gemini-pro",
            {
                prompt:
                    "What are the benefits of containerization in software development? Answer in 2-3 sentences.",
                systemPrompt:
                    "You are a helpful AI assistant that provides concise explanations.",
            },
        );

        console.log("Response from Google model:");
        console.log(googleModelResponse.text);
        console.log("Token usage:", googleModelResponse.usage);
        const geminiProModel = modelSelectionFactory.getModelById('gemini-pro');
        console.log(calculateCost(geminiProModel, googleModelResponse.usage));

        // Test default model completion
        console.log("\nTesting default model completion...");
        const defaultResponse = await modelService.completeWithDefaultModel({
            prompt:
                'Explain what a "fan-out, fan-in" pattern is in distributed computing. Answer in 2-3 sentences.',
            systemPrompt:
                "You are a helpful AI assistant that provides concise explanations.",
        });

        console.log("Response from default model:");
        console.log(defaultResponse.text);
        console.log("Token usage:", defaultResponse.usage);
        if (typeof defaultResponse.modelId === 'string') {
            const defaultModel = modelSelectionFactory.getModelById(defaultResponse.modelId);
            console.log(calculateCost(defaultModel, defaultResponse.usage));
        } else {
            console.log("Cost: unknown (model ID not provided)");
        }

        // Test OCR capability
        console.log("\nTesting OCR capability...");
        console.log("Available OCR models:");
        const ocrModels = modelSelectionFactory.getModelsWithCapability("ocr");
        for (const model of ocrModels) {
            console.log(`- ${model.id} (${model.provider}) - Cost per 1k tokens: $${model.costPer1kTokens || 'unknown'}`);
        }

        const ocrResponse = await modelService.completeWithModel(
            "ocr",
            {
                prompt: "Extract all text from the provided image of a receipt.",
                systemPrompt: "You are a helpful AI assistant that extracts text from images accurately.",
            },
        );

        console.log("Response from OCR task model:");
        console.log(ocrResponse.text);
        console.log("Token usage:", ocrResponse.usage);
        if (typeof ocrResponse.modelId === 'string') {
            const ocrModel = modelSelectionFactory.getModelById(ocrResponse.modelId);
            console.log(calculateCost(ocrModel, ocrResponse.usage));
        } else {
            console.log("Cost: unknown (model ID not provided)");
        }

        // Test search capability
        console.log("\nTesting search capability...");
        console.log("Available search models:");
        const searchModels = modelSelectionFactory.getModelsWithCapability("search");
        for (const model of searchModels) {
            console.log(`- ${model.id} (${model.provider}) - Cost per 1k tokens: $${model.costPer1kTokens || 'unknown'}`);
        }

        const searchResponse = await modelService.completeWithModel(
            "search",
            {
                prompt: "What are the latest developments in quantum computing?",
                systemPrompt: "You are a helpful AI assistant that provides up-to-date information using web search.",
            },
        );

        console.log("Response from search task model:");
        console.log(searchResponse.text);
        console.log("Token usage:", searchResponse.usage);
        if (typeof searchResponse.modelId === 'string') {
            const searchModel = modelSelectionFactory.getModelById(searchResponse.modelId);
            console.log(calculateCost(searchModel, searchResponse.usage));
        } else {
            console.log("Cost: unknown (model ID not provided)");
        }
    } catch (error) {
        console.error("Error testing model service:", error);
    }
}

// Run the test
testModelService().catch(console.error);
