import type { RunnableFunc } from '@langchain/core/runnables';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { ImageState } from '../state';

/**
 * Node handler for initializing a normalization run
 * @param state Current normalization state
 * @returns Updated state with initialization complete
 */
export const initializeRunNode: RunnableFunc<ImageState, ImageState> = async (
  state: ImageState
): Promise<ImageState> => {

  // Generate a unique run ID (timestamp + random chars)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const randomChars = crypto.randomBytes(4).toString("hex")
  const runId = `run-${timestamp}-${randomChars}`

  // Set up run directories
  const outputDir = setupRunDirectories(runId)

  // Create run info
  const runInfo = {
    runId,
    startTime: timestamp,
    outputDir
  }

  return {
    ...state,
    status: 'loading'
  };
};

// Helper function for setting up run directories
function setupRunDirectories(runId: string): string {
  const baseDir = path.join(process.cwd(), "data", "image", "runs", runId)

  // Create main run directory
  fs.mkdirSync(baseDir, { recursive: true })

  // Create subdirectories for different outputs
  const dirs = [
    "image-results",
    "logs",
    "errors"
  ]

  for (const dir of dirs) {
    fs.mkdirSync(path.join(baseDir, dir), { recursive: true })
  }

  return baseDir
}