import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { BasicClusteringResult, ClusteringState } from "../types.js"
import { logToRun, parseJsonFromMarkdown } from "../utils.js"
import { getPrompt } from "../prompts/index.js"
import { generateText } from "ai"
import { getLLM } from "../models.js"
import chalk from "chalk"

type ClusteringStateUpdate = Partial<ClusteringState>

/**
 * Node 2: Create basic clusters
 */
export async function createBasicClustersNode(
    state: ClusteringState,
    config: RunnableConfig,
): Promise<ClusteringStateUpdate> {
    console.log(chalk.blue("createBasicClustersNode()"))

    try {
        // Update status
        const statusUpdate = {
            status: 'creating_basic_clusters',
            completedSteps: state.completedSteps,
            logs: [...state.logs, 'Creating basic persona clusters']
        }

        // Check for normalized profiles
        if (!state.normalizedProfiles || state.normalizedProfiles.length === 0) {
            const errorMsg = 'No normalized profiles found in state'
            logToRun(state.runInfo, errorMsg, 'error')
            return {
                ...statusUpdate,
                status: 'error',
                error: errorMsg,
                logs: [...state.logs, errorMsg]
            }
        }

        logToRun(
            state.runInfo,
            `Creating basic persona clusters from ${state.normalizedProfiles.length} profiles`,
        )

        logToRun(state.runInfo, "Calling LLM to create basic clusters")

        // Get the prompt service
        const prompt = getPrompt('basic-clustering', {
            normalizedProfilesCount: state.normalizedProfiles.length,
            normalizedProfilesData: JSON.stringify(state.normalizedProfiles, null, 2)
        })

        // Use the prompt service to complete the clustering task
        const responseText = await generateText({
            model: getLLM("o1-mini"),
            prompt
        })

        // Add more robust JSON extraction
        let clusteringResult: BasicClusteringResult
        try {
            clusteringResult = parseJsonFromMarkdown(responseText.text) as BasicClusteringResult
        } catch (parseError) {
            // Log the full response for debugging
            const debugPath = path.join(
                state.runInfo.outputDir,
                "logs",
                "clustering_response.txt"
            )
            fs.writeFileSync(debugPath, responseText.text)
            throw new Error(`Failed to parse LLM response: ${parseError}. Full response saved to ${debugPath}`)
        }

        // Save the clusters to a file
        const date = new Date().toISOString().split("T")[0]
        if (state.runInfo?.outputDir) {
            const outputPath = path.join(
                state.runInfo.outputDir,
                "basic-clusters",
                "basic_clusters.json",
            )
            fs.mkdirSync(path.dirname(outputPath), { recursive: true })
            fs.writeFileSync(outputPath, JSON.stringify(clusteringResult, null, 2))

            const successMsg = `Successfully saved basic clusters with ${clusteringResult.clusters.length} personas`
            logToRun(state.runInfo, successMsg)
            logToRun(state.runInfo, `Saved to ${outputPath}`)

            const completedSteps = [...state.completedSteps, "create_basic_clusters"]
            const logs = [...state.logs, successMsg, `Saved to ${outputPath}`]

            return {
                ...statusUpdate,
                basicClusters: clusteringResult,
                status: "basic_clusters_created",
                completedSteps: completedSteps,
                logs: logs
            }
        }

        const successMsg = `Successfully created basic clusters with ${clusteringResult.clusters.length} personas`
        logToRun(state.runInfo, successMsg)

        return {
            ...statusUpdate,
            basicClusters: clusteringResult,
            status: "basic_clusters_created",
            completedSteps: [...state.completedSteps, "create_basic_clusters"],
            logs: [...state.logs, successMsg],
        }
    } catch (error) {
        const errorMsg = error instanceof Error
            ? error.message
            : "Unknown error during cluster creation"

        // Log the error for debugging
        console.error('Cluster creation error:', {
            error,
            errorType: typeof error,
            errorMessage: errorMsg
        })

        logToRun(state.runInfo, `Error creating basic clusters: ${errorMsg}`, "error")
        return {
            status: "error",
            error: `Error creating basic clusters: ${errorMsg}`,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }
} 