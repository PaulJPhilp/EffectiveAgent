import { z } from "zod"

/**
 * Schema for normalizing agent configuration
 */
export const NormalizingAgentConfigSchema = z.object({
    name: z.literal("normalizing"),
    version: z.string(),
    description: z.string(),
    defaultModel: z.string(),
    batchSize: z.number().int().positive(),
    retryConfig: z.object({
        maxAttempts: z.number().int().positive(),
        delayMs: z.number().int().positive()
    }),
    paths: z.object({
        prompts: z.string(),
        tasks: z.string(),
        cache: z.string().optional()
    }),
    validation: z.object({
        requiredFields: z.array(z.string()),
        fieldTypes: z.record(z.enum([
            "string",
            "number",
            "boolean",
            "date",
            "array",
            "object"
        ]))
    })
}).strict()

export type NormalizingAgentConfig = z.infer<typeof NormalizingAgentConfigSchema>

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: NormalizingAgentConfig = {
    name: "normalizing",
    version: "1.0.0",
    description: "Agent for normalizing PDF content into structured profiles",
    defaultModel: "gpt-4-turbo-preview",
    batchSize: 2,
    retryConfig: {
        maxAttempts: 3,
        delayMs: 1000
    },
    paths: {
        prompts: "prompts.json",
        tasks: "tasks.json"
    },
    validation: {
        requiredFields: [
            "name",
            "email",
            "phone",
            "skills",
            "experience"
        ],
        fieldTypes: {
            name: "string",
            email: "string",
            phone: "string",
            skills: "array",
            experience: "array",
            education: "array",
            summary: "string"
        }
    }
} 