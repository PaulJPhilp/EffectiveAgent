import type { RunnableConfig } from "@langchain/core/runnables"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import type { NormalizationState } from "../types.js"
import { logToRun } from "../utils.js"

type NormalizationStateUpdate = Partial<NormalizationState>

/**
 * Node 0: Initialize normalization run
 */
export async function initializeRunNode(
    state: NormalizationState,
    config: RunnableConfig,
): Promise<NormalizationStateUpdate> {
    console.log("initializeRunNode()")

    try {
        // Generate a unique run ID (timestamp + random chars)
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
        const randomChars = crypto.randomBytes(4).toString("hex")
        const runId = `run-${timestamp}-${randomChars}`

        // Set up run directories
        const outputDir = setupRunDirectories(runId)

        // Create run info
        const runInfo = {
            runId,
            startTime: new Date(),
            outputDir
        }

        // Log run initialization
        logToRun(runInfo, `Initializing normalization run: ${runId}`)

        return {
            runInfo,
            status: "run_initialized",
            completedSteps: ["initialize_run"],
            logs: [`Run ${runId} initialized`],
        }
    } catch (error) {
        console.error("[NORMALIZE AGENT] Error in initializeRunNode:", error)
        return {
            status: "error",
            error: `Error initializing run: ${error instanceof Error ? error.message : String(error)}`,
        }
    }
}

// Helper function for setting up run directories
function setupRunDirectories(runId: string): string {
    const baseDir = path.join(process.cwd(), "data", "normalized", "runs", runId)

    // Create main run directory
    fs.mkdirSync(baseDir, { recursive: true })

    // Create subdirectories for different outputs
    const dirs = [
        "profiles",
        "logs",
        "errors"
    ]

    for (const dir of dirs) {
        fs.mkdirSync(path.join(baseDir, dir), { recursive: true })
    }

    return baseDir
} 