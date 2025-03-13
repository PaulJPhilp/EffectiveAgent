import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { ClusteringState } from "../types.js"
import { logToRun, parseJsonFromMarkdown } from "../utils.js"

type ClusteringStateUpdate = Partial<ClusteringState>

/**
 * Node 1: Load normalized profiles
 */
export async function loadNormalizedProfilesNode(
    state: ClusteringState,
    config: RunnableConfig
): Promise<ClusteringStateUpdate> {
    console.log("loadNormalizedProfilesNode()")

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

        // Read all directories
        const profileDirs = fs
            .readdirSync(normalizedProfilesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)

        const normalizedProfiles = []

        for (const profileDir of profileDirs) {
            const profilePath = path.join(normalizedProfilesDir, profileDir)
            const mergedJsonPath = path.join(profilePath, ".merged.json")

            if (fs.existsSync(mergedJsonPath)) {
                try {
                    const profileData = parseJsonFromMarkdown(
                        fs.readFileSync(mergedJsonPath, "utf8"),
                    )
                    normalizedProfiles.push(profileData)
                } catch (error) {
                    const errorMsg = `Error parsing merged profile ${profileDir}: ${error}`
                    logToRun(state.runInfo, errorMsg, "error")
                }
            } else {
                const jsonFiles = fs
                    .readdirSync(profilePath)
                    .filter((file) => file.endsWith(".json"))

                if (jsonFiles.length > 0) {
                    try {
                        const profileData = parseJsonFromMarkdown(
                            fs.readFileSync(path.join(profilePath, jsonFiles[0]), "utf8"),
                        )
                        normalizedProfiles.push(profileData)
                    } catch (error) {
                        const errorMsg = `Error parsing profile ${profileDir}: ${error}`
                        logToRun(state.runInfo, errorMsg, "error")
                    }
                }
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
            normalizedProfiles,
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