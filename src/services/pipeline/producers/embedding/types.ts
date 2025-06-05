export interface EmbeddingGenerationOptions {
    text: string;
    modelId?: string;
}

export interface EmbeddingGenerationResult {
    embeddings: number[][];
    model: string;
    usage?: {
        promptTokens: number;
        totalTokens: number;
    };
} 