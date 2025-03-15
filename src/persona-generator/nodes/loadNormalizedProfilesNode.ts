import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { ClusteringState, NormalizedProfile } from "../types.js"
import { logToRun, parseJsonFromMarkdown } from "../utils.js"
import chalk from "chalk"

type ClusteringStateUpdate = Partial<ClusteringState>

/**
 * Node 1: Load normalized profiles
 */
export async function loadNormalizedProfilesNode(
    state: ClusteringState,
    config: RunnableConfig
): Promise<ClusteringStateUpdate> {
    console.log(chalk.blue("loadNormalizedProfilesNode()"))

    try {
        logToRun(state.runInfo, "Loading normalized profiles")
        // Create the status update
        const statusUpdate = {
            status: 'loading_profiles',
            completedSteps: state.completedSteps ? [...state.completedSteps] : [],
            logs: state.logs ? [...state.logs, 'Loading normalized profiles'] : ['Loading normalized profiles']
        }

        // Define the path to normalized profiles
        const normalizedProfilesDir = path.join(
            process.cwd(),
            "data",
            "normalized",
        )
        // Check if directory exists
        if (!fs.existsSync(normalizedProfilesDir)) {
            const errorMsg = `Normalized profiles directory not found: ${normalizedProfilesDir}`
            logToRun(state.runInfo, errorMsg, "error")
            return {
                ...statusUpdate,
                status: 'error',
                error: errorMsg,
                logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
            }
        }

        const normalizedProfiles: NormalizedProfile[] = []
        const jsonFiles = fs
            .readdirSync(normalizedProfilesDir)
            .filter((file) => file.endsWith(".json"))

        const preloadMsg = `Preloading normalized profiles: ${jsonFiles.length} files found`
        logToRun(state.runInfo, preloadMsg)

        for (const jsonFile of jsonFiles) {
            try {
                const profileData = JSON.parse(fs.readFileSync(path.join(normalizedProfilesDir, jsonFile), "utf8")) as NormalizedProfile
                normalizedProfiles.push(profileData)
            } catch (error) {
                const errorMsg = `Error parsing profile ${jsonFile}: ${error instanceof Error ? error.message : String(error)}`
                logToRun(state.runInfo, errorMsg, "error")
            }
        }

        if (normalizedProfiles.length === 0) {
            const errorMsg = "No valid profiles found"
            logToRun(state.runInfo, errorMsg, "error")
            return {
                ...statusUpdate,
                status: 'error',
                error: errorMsg,
                logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
            }
        }

        const successMsg = `Successfully loaded ${normalizedProfiles.length} normalized profiles`
        logToRun(state.runInfo, successMsg)

        const returnValue: ClusteringStateUpdate = {
            runInfo: state.runInfo,
            normalizedProfiles: normalizedProfiles as NormalizedProfile[],
            basicClusters: state.basicClusters,
            error: state.error,
            status: 'profiles_loaded',
            completedSteps: [...(state.completedSteps || []), 'load_normalized_profiles'],
            logs: [...(state.logs || []), successMsg]
        }
        return returnValue

    } catch (error) {
        const errorMsg = `Error loading normalized profiles: ${error instanceof Error ? error.message : String(error)}`
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: 'error',
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }
} 