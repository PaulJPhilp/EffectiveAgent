import { TaskSchema } from '@/shared/services/task/schemas/taskSchemas.ts'
import { z } from 'zod'

export const AgentRunSchema = z.object({
    runId: z.string().uuid(),
    startTime: z.string().datetime(),
    outputDir: z.string(),
    inputDir: z.string(),
    description: z.string().optional(),
    completedSteps: z.array(z.string()).optional()
})

export const AgentConfigSchema = z.object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    tags: z.array(z.string()).optional(),
    rootPath: z.string(),
    agentPath: z.string(),
    inputPath: z.string(),
    outputPath: z.string(),
    logPath: z.string(),
    maxConcurrency: z.number().int().positive(),
    maxRetries: z.number().int().nonnegative(),
    retryDelay: z.number().positive(),
    debug: z.boolean().optional(),
    environment: z.string().optional(),
    tasks: z.array(TaskSchema),
    configFiles: z.object({
        providers: z.string(),
        models: z.string(),
        prompts: z.string(),
        tasks: z.string()
    })
}) 