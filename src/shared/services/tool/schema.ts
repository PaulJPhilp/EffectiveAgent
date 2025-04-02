import { z } from "zod"
import { BaseConfigSchema, TagsSchema } from "../configuration/schema.js"

/**
 * Schema for tool library configuration
 */
export const ToolLibraryConfigSchema = BaseConfigSchema.extend({
    path: z.string()
        .min(3, { message: "Path must be at least 3 characters long" })
        .describe("Filesystem path to the directory containing the tool implementations"),
    tools: z.array(
        z.string()
            .min(3, { message: "Tool name must be at least 3 characters long" })
    ).describe("Array of tool filenames to load from the library path"),
    tags: TagsSchema
}).strict()

type ToolLibraryConfig = z.infer<typeof ToolLibraryConfigSchema>

/**
 * Schema for agent tool configuration
 */
export const AgentToolConfigSchema = BaseConfigSchema.extend({
    standardLibrary: ToolLibraryConfigSchema,
    agentLibrary: ToolLibraryConfigSchema.optional()
}).strict()

export type AgentToolConfig = z.infer<typeof AgentToolConfigSchema> 