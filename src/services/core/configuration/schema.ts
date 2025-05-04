// File: src/services/core/configuration/schema.ts

import { z } from "zod";

// --- Environment Config Schema ---
export const EnvironmentConfigSchema = z.object({
    nodeEnv: z.enum(["development", "test", "production"]).optional(),
    logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
    isDebug: z.boolean().optional()
});

// --- Base Config Schema ---
// All config files must extend this base schema
export const BaseConfigSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    version: z.string().min(1),
    tags: z.array(z.string()).default([])
}).strict();