/**
 * @file Bootstrap function for loading master configuration
 * @module agent-runtime/bootstrap
 */

import { readFileSync } from "fs";
import { AgentRuntimeInitializationError } from "./errors.js";
import type { MasterConfig } from "./schema.js";

/**
 * Bootstrap function: Pure TypeScript function that loads master config
 * This is the entry point for loading the master configuration
 */
export function bootstrap(): MasterConfig {
    try {
        // Step 1: Determine Master Configuration Path
        const masterConfigPath = process.env.MASTER_CONFIG_PATH ||
            process.env.EFFECTIVE_AGENT_MASTER_CONFIG ||
            "./config/master-config.json";

        // Step 2: Load and Parse Master Configuration  
        const masterConfigContent = readFileSync(masterConfigPath, "utf8");
        const masterConfig = JSON.parse(masterConfigContent) as MasterConfig;

        // Step 3: Basic validation
        if (!masterConfig.runtimeSettings) {
            throw new Error("Master config missing runtimeSettings");
        }

        return masterConfig;
    } catch (error) {
        throw new AgentRuntimeInitializationError({
            description: "Failed to load master configuration during bootstrap",
            module: "AgentRuntime",
            method: "bootstrap",
            cause: error
        });
    }
} 