/**
 * Configuration types for tasks
 */

/**
 * Task definition interface
 */
export interface TaskDefinition {
    /** Name of the task */
    readonly name: string;
    /** Description of the task */
    readonly description?: string;
    /** Name of the prompt template to use */
    readonly promptName: string;
    /** Primary model ID to use for the task */
    readonly primaryModelId: string;
    /** Optional temperature for the task */
    readonly temperature?: number;
    /** Optional thinking level for the task */
    readonly thinkingLevel?: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Task execution options interface
 */
export interface TaskExecutionOptions {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    variables?: Record<string, string>;
    format?: 'text' | 'json' | 'image' | 'embedding';
}

/**
 * Result of task execution interface
 */
export interface TaskExecutionResult {
    metadata: any;
    taskName: string;
    result: string;
    modelId?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
