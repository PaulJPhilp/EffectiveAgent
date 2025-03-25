import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import type { NormalizationResult, NormalizationState } from "../types.js"
import { logToRun } from "../utils.js"

type NormalizationStateUpdate = Partial<NormalizationState>

interface NormalizationSummary {
    totalProfiles: number
    successfulNormalizations: number
    failedNormalizations: number
    errors: Array<{
        profileName: string
        error: string
    }>
}

/**
 * Node 3: Save normalized profiles and generate summary
 */
export async function saveResultsNode(
    state: NormalizationState,
    config: RunnableConfig
): Promise<NormalizationStateUpdate> {
    console.log("saveResultsNode()")

    if (!state.normalizedProfiles || !state.normalizationResults) {
        const errorMsg = "No normalization results to save"
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: 'error',
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }

    console.log(`Number of Normalized Profiles: ${state.normalizedProfiles.length}`)
    console.log(`Number of Normalization Results: ${state.normalizationResults.length}`)

    try {
        logToRun(state.runInfo, "Saving normalization results")
        const statusUpdate = {
            status: 'saving_results',
            completedSteps: state.completedSteps,
            logs: state.logs ? [...state.logs, 'Saving results'] : ['Saving results']
        }

        // Save normalized profiles
        const outputDir = path.join(
            process.cwd(),
            "data",
            "normalized"
        )
        fs.mkdirSync(outputDir, { recursive: true })

        // Save individual profiles
        for (const profile of state.normalizedProfiles) {
            const filePath = path.join(outputDir, `${profile.name}.json`)
            //console.log(`Saving profile: ${filePath}`)
            fs.writeFileSync(filePath, JSON.stringify(profile, null, 2))
        }

        // Generate and save summary
        const summary = generateSummary(
            state.normalizationResults,
            state.profiles?.length ?? 0
        )
        const summaryPath = path.join(outputDir, "summary.json")
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

        // Generate report message
        const reportMsg = [
            `Normalization Summary:`,
            `- Total Profiles: ${summary.totalProfiles}`,
            `- Successful: ${summary.successfulNormalizations}`,
            `- Failed: ${summary.failedNormalizations}`,
            `- Success Rate: ${((summary.successfulNormalizations / summary.totalProfiles) * 100).toFixed(1)}%`,
            `\nResults saved to: ${outputDir}`
        ].join("\n")

        logToRun(state.runInfo, reportMsg)

        return {
            ...statusUpdate,
            status: 'complete',
            summary,
            completedSteps: [...(state.completedSteps || []), 'save_results'],
            logs: [...(state.logs || []), reportMsg]
        }

    } catch (error) {
        const errorMsg = `Error saving results: ${error instanceof Error ? error.message : String(error)}`
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: 'error',
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }
}

function generateSummary(
    results: NormalizationResult[],
    totalProfiles: number
): NormalizationSummary {
    const successfulNormalizations = results.filter(r => r.success).length
    const failedNormalizations = results.filter(r => !r.success).length
    const errors = results
        .filter(r => !r.success && r.error)
        .map(r => ({
            profileName: r.profileName,
            error: r.error || "Unknown error"
        }))

    return {
        totalProfiles,
        successfulNormalizations,
        failedNormalizations,
        errors
    }
} 