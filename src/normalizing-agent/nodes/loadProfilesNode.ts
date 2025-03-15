import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { NormalizationState } from "../NormalizationState.js"
import { logToRun } from "../utils.js"
import { loadFiles } from "../utils.js"
import { parseProfileData } from "../parseProfile.js"
import type { Document } from "@langchain/core/documents"
import type { ProfileData } from "../types.js"

type NormalizationStateUpdate = Partial<NormalizationState>

/**
 * Node 1: Load profiles to normalize
 */
export async function loadProfilesNode(
    state: NormalizationState,
    config: RunnableConfig
): Promise<NormalizationStateUpdate> {
    console.log("loadProfilesNode()")

    // Create the status update
    const statusUpdate: NormalizationStateUpdate = {
        status: 'loading_profiles',
        completedSteps: state.completedSteps,
        logs: [...(state.logs ?? []), 'Loading profiles']
    }

    try {
        logToRun(state.runInfo, "Loading profiles to normalize")

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
                logs: [...(state.logs ?? []), errorMsg]
            }
        }

        const files = await loadFiles(profilesDir)

        const profiles: Array<Partial<ProfileData>> = []
        for (const file of files.txt ?? []) { 
            const profile: Partial<ProfileData> = { name: file.id ?? "No Name", fileText: file.pageContent ?? "", fileType: "text" }
            profiles.push(profile)
        }

        for (const file of files.pdf ?? []) { 
            const profile: Partial<ProfileData> = { name: file.id ?? "No Name", fileText: file.pageContent ?? "", fileType: "pdf" }
            profiles.push(profile)
        }

        if (profiles.length === 0) {
            const errorMsg = "No valid profiles found"
            logToRun(state.runInfo, errorMsg, "error")
            return {
                ...statusUpdate,
                status: 'error',
                error: errorMsg,
                logs: [...(state.logs ?? []), errorMsg]
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
            ...statusUpdate,
            status: 'error',
            error: errorMsg,
            logs: [...(state.logs ?? []), errorMsg]
        }
    }
}