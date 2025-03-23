import type { RunnableFunc } from '@langchain/core/runnables';
import type { ClusteringState } from '../state.js';
import { TaskService } from '../../../shared/services/task/taskService';
import { extractJsonFromResponse, logToRun } from '../../utils';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Handles saving and summarizing persona generation results
 */
class ResultSaver {
    private readonly debug: boolean = false;
    private readonly taskService: TaskService;
    private readonly state: ClusteringState;

    constructor(state: ClusteringState) {
        if (this.debug) console.log(`[ResultSaver] Initializing with config path: ${process.cwd()}/agents/persona-generator/config`);
        this.taskService = new TaskService({
            configPath: process.cwd() + '/agents/persona-generator/config',
        });
        if (this.debug) console.log(`[ResultSaver] Task service initialized`);
        this.state = state;
    }

    /**
     * Generates an executive summary of the persona generation results
     */
    private async generateSummary(): Promise<string> {
        const taskResult = await this.taskService.executeTask('executive-summary', {
            variables: {
                personas: JSON.stringify(this.state.elaboratedPersonas, null, 2),
                format: 'json'
            }
        });
        //if (this.debug) console.log(`[ResultSaver] Generated summary: ${taskResult.result}`);
        return taskResult.result;
    }

    /**
     * Saves all results and generates summary
     */
    async saveResults(): Promise<{ summary: string }> {
        if (!this.state.elaboratedPersonas) {
            throw new Error('No elaborated personas available to save');
        }

        // Generate summary
        const summary = await this.generateSummary();

        // Save summary
        const summaryPath = path.join(
            this.state.runInfo.outputDir,
            'personas',
            'summary.json'
        );
        if (this.debug) console.log(`[ResultSaver] Saving summary to ${summaryPath}`);
        fs.writeFileSync(summaryPath, summary);

        // Save final results
        const resultsPath = path.join(
            this.state.runInfo.outputDir,
            "personas",
            'final-results.json'
        );
        if (this.debug) console.log(`[ResultSaver] Saving final results to ${resultsPath}`);
        fs.writeFileSync(
            resultsPath,
            JSON.stringify({
                runInfo: this.state.runInfo,
                personas: this.state.elaboratedPersonas,
                summary,
                completedAt: new Date().toISOString()
            }, null, 2)
        );

        return { summary };
    }
}

/**
 * Node handler for saving persona generation results
 * @param state Current clustering state
 * @returns Updated state with saved results
 */
export const saveResultsNode: RunnableFunc<ClusteringState, ClusteringState> = async (
    state: ClusteringState
): Promise<ClusteringState> => {
    logToRun(state.runInfo, 'Saving results');

    // Create saver instance
    const saver = new ResultSaver(state);

    // Save results and generate summary
    const { summary } = await saver.saveResults();

    // Return updated state
    return {
        ...state,
        status: 'complete',
        completedSteps: [...(state.completedSteps || []), 'save_results'],
        logs: [...(state.logs || []), 'Saved results and generated summary'],
        //recommendations: [...(state.recommendations || []), ...(summary.recommendations || [])]
    };
};