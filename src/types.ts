export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONObject
    | JSONArray;

export interface JSONObject {
    [key: string]: JSON;
}

export type JSONArray = JSON[];

export type ModelCompletionFormat = 'text' | 'json' | 'image' | 'embedding';
export type ModelCompletionSize = 'small' | 'medium' | 'large';
export type ModelCompletionQuality = 'standard' | 'hd' | 'pro';
export type ModelCompletionStyle = 'casual' | 'formal' | 'creative' | 'technical';
export type ModelCompletionProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'mistral' | 'ollama' | 'gemma' | 'deepseek' | 'xai' | "local";


export interface ModelCompletionUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
};

export interface ModelCompletionOptions<T extends JSONValue = JSONValue> {
    modelId: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    size?: ModelCompletionSize;
    quality?: ModelCompletionQuality;
    style?: ModelCompletionStyle;
    format?: ModelCompletionFormat;
    validator?: (data: unknown) => data is T;
}

export interface ModelCompletionResponse {
    modelId: string;
    finishReason: string;
    text?: string;
    json?: JSONValue;
    image?: string;
    embedding?: number[];
    usage: ModelCompletionUsage;
}

/**
 * Schema for task capability
 * Defines the capabilities a model must have to handle the task
 */
export const TaskCapabilities = [
    'code',
    'text-generation',
    'chat',
    'function-calling',
    'vision',
    'reasoning',
    'tool-use',
    'embeddings',
    'math',
    'text-to-image'
] as const;
