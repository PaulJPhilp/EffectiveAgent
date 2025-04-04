// File: schema.ts

import { z } from 'zod';

/**
 * Schema for validating the structure of the agent run information.
 * Corresponds to the AgentRun type.
 */
export const AgentRunSchema = z.object({
    runId: z.string().uuid({ message: 'runId must be a valid UUID' }),
    startTime: z.string().datetime({ message: 'startTime must be a valid ISO 8601 datetime string' }),
    outputDir: z.string().min(1, { message: 'outputDir is required' }),
    inputDir: z.string().min(1, { message: 'inputDir is required' }),
    description: z.string().optional(),
    completedSteps: z.array(z.string()).optional().default([]), // Default to empty array if missing
});

/**
 * Placeholder Schema for Task Configuration.
 * In a real application, this would likely be more detailed and potentially
 * imported from the specific task service module.
 * Example: '@services/task/schemas/taskConfig.js'
 */
export const TaskConfigSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    // Add other task-specific fields and validation as needed
    primaryModelId: z.string().min(1), // Example field from original validation logic
    // ... other fields
}).passthrough(); // Use passthrough if tasks can have arbitrary extra config

/**
 * Schema for validating the main agent configuration file (e.g., config.json).
 * Corresponds to the AgentConfig type.
 */
export const AgentConfigSchema = z.object({
    name: z.string().min(1, { message: 'Agent name is required' }),
    agentName: z.string().min(1, { message: 'Agent identifier (agentName) is required' }),
    description: z.string().default(''), // Provide default if optional
    version: z.string().min(1, { message: 'Agent version is required' }),
    tags: z.array(z.string()).optional().default([]),
    rootPath: z.string().min(1, { message: 'rootPath is required' }),
    agentPath: z.string().min(1, { message: 'agentPath is required' }),
    inputPath: z.string().min(1, { message: 'inputPath is required' }),
    outputPath: z.string().min(1, { message: 'outputPath is required' }),
    logPath: z.string().min(1, { message: 'logPath is required' }),
    maxConcurrency: z.number().int().positive({ message: 'maxConcurrency must be a positive integer' }).optional().default(1),
    maxRetries: z.number().int().nonnegative({ message: 'maxRetries must be a non-negative integer' }).optional().default(0),
    retryDelay: z.number().positive({ message: 'retryDelay must be a positive number (milliseconds)' }).optional().default(1000),
    debug: z.boolean().optional().default(false),
    environment: z.string().optional(),
    // Validate that tasks is an array of valid TaskConfig objects
    tasks: z.array(TaskConfigSchema).optional().default([]),
    // Validate the structure for config file paths
    configFiles: z.object({
        providers: z.string().min(1, { message: 'providers config file path is required' }),
        models: z.string().min(1, { message: 'models config file path is required' }),
        prompts: z.string().min(1, { message: 'prompts config file path is required' }),
        tasks: z.string().min(1, { message: 'tasks config file path is required' }),
    }),
});

// You might also include schemas for providers.json, models.json, prompts.json here
// if they are not defined within their respective service modules. For example:

/*
export const ProviderConfigSchema = z.object({
    name: z.string(),
    apiKeyEnvVar: z.string().optional(),
    // ... other provider fields
});

export const ProvidersFileSchema = z.object({
    providers: z.array(ProviderConfigSchema),
});

export const ModelConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string(), // Reference to provider name
    // ... other model fields
});

export const ModelConfigFileSchema = z.object({
    models: z.array(ModelConfigSchema),
});

export const PromptConfigSchema = z.object({
    id: z.string(),
    template: z.string(),
    // ... other prompt fields
});

export const PromptConfigFileSchema = z.object({
    prompts: z.array(PromptConfigSchema),
});
*/
