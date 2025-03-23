import type { RunnableFunc } from '@langchain/core/runnables';
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ClusteringState } from "../state.js";
import { logToRun, saveRunMetadata } from "../../utils";
import { AgentConfig } from '../../config/config-types.js';

/**
 * Node handler for initializing a persona generation run
 * @param state Current clustering state
 * @returns Updated state with initialization complete
 */
export const initializeRunNode: RunnableFunc<ClusteringState, ClusteringState> = async (
  state: ClusteringState
): Promise<ClusteringState> => {
  try {
    // Generate a unique run ID (timestamp + random chars)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const randomChars = crypto.randomBytes(4).toString("hex");
    const runId = `run-${timestamp}-${randomChars}`;

    // Set up run directories using helper function
    const outputDir = setupRunDirectories(runId, state.config);

    // Create run info
    const runInfo = {
      runId,
      startTime: new Date().toISOString(),
      outputDir,
      inputDir: state.runInfo.inputDir
    };

    // Log run initialization
    logToRun(runInfo, `Initializing persona generation run: ${runId}`);

    // Save initial run metadata
    saveRunMetadata(runInfo);

    // Return full updated state
    return {
      ...state,
      runInfo,
      status: 'loading',
      completedSteps: ["initialize_run"],
      logs: [`Run ${runId} initialized`],
      error: "",
      errorCount: 0
    };
  } catch (error) {
    console.error("[CLUSTER GRAPH] Error in initializeRunNode:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ...state,
      status: "error",
      error: `Error initializing run: ${errorMessage}`,
      errorCount: (state.errorCount || 0) + 1,
      logs: [...(state.logs || []), `Error initializing run: ${errorMessage}`]
    };
  }
};

function setupRunDirectories(runId: string, config: AgentConfig): string {

  const baseDir = path.join(config.outputPath, config.name, "runs", runId);

  // Create main run directory
  fs.mkdirSync(baseDir, { recursive: true });

  // Create subdirectories for different outputs
  const dirs = [
    "clusters",
    "personas",
    "logs",
    "errors"
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
  }

  return baseDir;
}