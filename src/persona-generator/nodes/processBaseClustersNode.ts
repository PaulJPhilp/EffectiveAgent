import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import { evaluatePersonaGraph } from "../evaluatePersonaGraph.js"
import type { ClusteringState, EvaluationState } from "../types.js"
import { logToRun, validateEvaluateState } from "../utils.js"

type ClusteringStateUpdate = Partial<ClusteringState>

export async function processBaseClustersNode(
    state: ClusteringState,
    config: RunnableConfig,
): Promise<ClusteringStateUpdate> {
    console.log("processBaseClustersNode()")

    if (!state.basicClusters || state.basicClusters.clusters.length === 0) {
        return {
            status: "error",
            error: "No basic clusters found to process",
            logs: [...state.logs, "No basic clusters found to process"],
        }
    }

    // Track which cluster we're currently processing
    const currentIndex = state.currentClusterIndex || 0

    // Check if we've processed all clusters
    if (currentIndex >= state.basicClusters.clusters.length) {
        return {
            status: "clusters_processed",
            logs: [...state.logs, `Processed all ${state.basicClusters.clusters.length} clusters`],
        }
    }

    // Create a modified EvaluationState with non-optional evaluation.answer
    interface ModifiedEvaluationState extends Omit<EvaluationState, 'evaluation'> {
        evaluation: {
            answer: "yes" | "no"
            recommendation: string
        }
    }

    // Process all personas in parallel (fan-out)
    console.log(`Processing all ${state.basicClusters.clusters.length} personas in parallel`)

    const processingResults = []
    const errors = []
    const elaboratedPersonas = []

    // Process each persona
    for (let i = 0; i < state.basicClusters.clusters.length; i++) {
        const currentCluster = state.basicClusters.clusters[i]
        try {
            console.log(`Processing persona ${i + 1}/${state.basicClusters.clusters.length}: ${currentCluster.title}`)

            const evaluationState: ModifiedEvaluationState = {
                runInfo: state.runInfo,
                currentPersona: currentCluster,
                elaboratedPersona: {
                    personaName: currentCluster.title || "Unnamed Persona",
                    title: currentCluster.title || "Untitled Persona"
                },
                evaluation: {
                    answer: "no",
                    recommendation: ""
                },
                executiveSummary: "",
                fullProfile: "",
                summaryReport: "",
                error: "",
                status: "",
                completedSteps: [],
                logs: [],
                recommendations: [],
                errorCount: 0,
                elaborationCount: 0
            }

            validateEvaluateState(evaluationState, `processBaseClustersNode() - persona ${i + 1}`)

            // Invoke the subgraph for this persona
            console.log(`Invoking evaluatePersonaGraph for persona ${i + 1}: ${currentCluster.title}`)
            const response = await evaluatePersonaGraph.invoke(evaluationState)
            console.log(`Evaluation Completed for persona ${i + 1}: ${currentCluster.title}`)

            // Store the elaborated persona if available
            if (response.elaboratedPersona && Object.keys(response.elaboratedPersona).length > 0) {
                elaboratedPersonas.push({
                    index: i,
                    originalPersona: currentCluster,
                    elaboratedPersona: response.elaboratedPersona,
                    executiveSummaries: response.executiveSummaries || {},
                    fullProfiles: response.fullProfiles || {}
                })
            }

            // Store the result
            processingResults.push({
                index: i,
                persona: currentCluster,
                response
            })

        } catch (error) {
            const errorMsg = `Error processing persona ${i + 1} (${currentCluster.title}): ${error instanceof Error ? error.message : String(error)}`
            logToRun(state.runInfo, errorMsg, "error")
            errors.push({
                index: i,
                persona: currentCluster,
                error: errorMsg
            })
        }
    }

    // Log summary of processing
    console.log(`Processed ${processingResults.length} personas successfully, ${errors.length} errors`)
    console.log(`Generated ${elaboratedPersonas.length} elaborated personas`)

    // Save elaborated personas to files for debugging and reference
    if (elaboratedPersonas.length > 0) {
        const elaboratedDir = path.join(state.runInfo.outputDir, "elaborated-personas")
        fs.mkdirSync(elaboratedDir, { recursive: true })

        elaboratedPersonas.forEach((item, index) => {
            const fileName = `persona_${index + 1}_${item.elaboratedPersona.personaName?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'unnamed'}.json`
            const filePath = path.join(elaboratedDir, fileName)
            fs.writeFileSync(filePath, JSON.stringify(item.elaboratedPersona, null, 2))
            console.log(`Saved elaborated persona to ${filePath}`)
        })
    }

    // Return updated state
    return {
        currentClusterIndex: state.basicClusters.clusters.length, // Mark all clusters as processed
        elaboratedPersonas: elaboratedPersonas.map(item => item.elaboratedPersona),
        status: "processing_complete",
        logs: [
            ...state.logs,
            `Processed ${processingResults.length} personas successfully, ${errors.length} errors`,
            `Generated ${elaboratedPersonas.length} elaborated personas`
        ],
    }
} 