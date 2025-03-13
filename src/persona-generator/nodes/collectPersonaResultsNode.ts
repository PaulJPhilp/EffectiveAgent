import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { ClusteringState } from "../types.js"
import { logToRun } from "../utils.js"

type ClusteringStateUpdate = Partial<ClusteringState>

/**
 * Node to collect and process results from all persona elaborations (fan-in phase)
 */
export async function collectPersonaResultsNode(
    state: ClusteringState,
    config: RunnableConfig,
): Promise<ClusteringStateUpdate> {
    console.log("collectPersonaResultsNode()")

    try {
        // At this point, all personas have been processed
        console.log("All personas have been processed, collecting results")

        // Check if we have elaborated personas
        if (!state.elaboratedPersonas || state.elaboratedPersonas.length === 0) {
            const warningMsg = "No elaborated personas found in state, using basic personas instead"
            console.warn(warningMsg)
            logToRun(state.runInfo, warningMsg, "warn")
        }

        // Create a summary report
        const summaryReport = {
            totalPersonas: state.basicClusters.clusters.length,
            elaboratedPersonas: state.elaboratedPersonas?.length || 0,
            processedAt: new Date().toISOString(),
            personas: state.elaboratedPersonas?.map(persona => ({
                name: persona.personaName || "Unnamed",
                title: persona.title || "Untitled",
                status: "elaborated"
            })) || state.basicClusters.clusters.map(persona => ({
                title: persona.title,
                status: "basic"
            }))
        }

        // Save the summary report
        const summaryPath = path.join(
            state.runInfo.outputDir,
            "personas-summary.json"
        )
        fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2))

        const successMsg = `Successfully processed all ${state.basicClusters.clusters.length} personas, elaborated ${state.elaboratedPersonas?.length || 0}`
        logToRun(state.runInfo, successMsg)
        logToRun(state.runInfo, `Summary saved to ${summaryPath}`)

        return {
            status: "all_personas_processed",
            completedSteps: [...state.completedSteps, "collect_persona_results"],
            logs: [...state.logs, successMsg, `Summary saved to ${summaryPath}`],
        }
    } catch (error) {
        const errorMsg = `Error collecting persona results: ${error instanceof Error ? error.message : String(error)}`
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: "error",
            error: errorMsg,
            logs: [...state.logs, errorMsg],
        }
    }
} 