import type { RunnableConfig } from "@langchain/core/runnables"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { getLLM } from "../models.js"
import type { ClusteringState } from "../types.js"
import { logToRun, saveRunMetadata } from "../utils.js"

type ClusteringStateUpdate = Partial<ClusteringState>

/**
 * Node 0: Initialize run
 */
export async function initializeRunNode(
    state: ClusteringState,
    config: RunnableConfig,
): Promise<ClusteringStateUpdate> {
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
            outputDir,
            model: getLLM("o1-mini")
        }

        // Log run initialization
        logToRun(runInfo, `Initializing persona generation run: ${runId}`)
        logToRun(runInfo, `Using model: ${runInfo.model.constructor.name}`)

        // Save initial run metadata
        saveRunMetadata(runInfo)

        return {
            runInfo,
            status: "run_initialized",
            completedSteps: ["initialize_run"],
            logs: [`Run ${runId} initialized`],
        }
    } catch (error) {
        console.error("[CLUSTER GRAPH] Error in initializeRunNode:", error)
        return {
            status: "error",
            error: `Error initializing run: ${error instanceof Error ? error.message : String(error)}`,
        }
    }
}

// Helper function for setting up run directories
function setupRunDirectories(runId: string): string {
    const baseDir = path.join(process.cwd(), "data", "personas", "runs", runId)

    // Create main run directory
    fs.mkdirSync(baseDir, { recursive: true })

    // Create subdirectories for different outputs
    const dirs = [
        "basic-clusters",
        "elaborated",
        "clustering-logs",
        "logs"
    ]

    for (const dir of dirs) {
        fs.mkdirSync(path.join(baseDir, dir), { recursive: true })
    }

    return baseDir
} 