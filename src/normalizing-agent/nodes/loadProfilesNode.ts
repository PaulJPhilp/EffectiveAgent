import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { NormalizationState, ProfileData } from "../types.js"
import { logToRun } from "../utils.js"

type NormalizationStateUpdate = Partial<NormalizationState>

/**
 * Node 1: Load profiles to normalize
 */
export async function loadProfilesNode(
    state: NormalizationState,
    config: RunnableConfig
): Promise<NormalizationStateUpdate> {
    console.log("loadProfilesNode()")

    try {
        logToRun(state.runInfo, "Loading profiles to normalize")
        // Create the status update
        const statusUpdate = {
            status: 'loading_profiles',
            completedSteps: state.completedSteps ? [...state.completedSteps] : [],
            logs: state.logs ? [...state.logs, 'Loading profiles'] : ['Loading profiles']
        }

        // Define the path to raw profiles
        const profilesDir = path.join(
            process.cwd(),
            "data",
            "raw",
        )
        // Check if directory exists
        if (!fs.existsSync(profilesDir)) {
            const errorMsg = `Raw profiles directory not found: ${profilesDir}`
            logToRun(state.runInfo, errorMsg, "error")
            return {
                ...statusUpdate,
                status: 'error',
                error: errorMsg,
                logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
            }
        }

        // Read all JSON files in the directory
        const profiles: ProfileData[] = []
        const jsonFiles = fs
            .readdirSync(profilesDir)
            .filter(file => file.endsWith('.json'))

        for (const file of jsonFiles) {
            try {
                const profileData = JSON.parse(
                    fs.readFileSync(path.join(profilesDir, file), "utf8")
                ) as ProfileData

                if (profileData?.name) {
                    profiles.push(profileData)
                } else {
                    const errorMsg = `Invalid profile data in ${file}: missing name property`
                    logToRun(state.runInfo, errorMsg, "error")
                }
            } catch (error) {
                const errorMsg = `Error parsing profile ${file}: ${error}`
                logToRun(state.runInfo, errorMsg, "error")
            }
        }

        if (profiles.length === 0) {
            const errorMsg = "No valid profiles found"
            logToRun(state.runInfo, errorMsg, "error")
            return {
                ...statusUpdate,
                status: 'error',
                error: errorMsg,
                logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
            }
        }

        const successMsg = `Successfully loaded ${profiles.length} profiles`
        logToRun(state.runInfo, successMsg)

        return {
            ...statusUpdate,
            profiles,
            status: 'profiles_loaded',
            completedSteps: [...(state.completedSteps || []), 'load_profiles'],
            logs: [...(state.logs || []), successMsg]
        }

    } catch (error) {
        const errorMsg = `Error loading profiles: ${error instanceof Error ? error.message : String(error)}`
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: 'error',
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }
} 