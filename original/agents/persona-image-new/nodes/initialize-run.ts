import fs from 'node:fs'
import path from 'path'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { ImageDomainState, ImageInput, ImageOutput } from '../types.js'

/**
 * Node that initializes a new image generation run
 */
export class InitializeRunNode extends AgentNode<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
    protected readonly debug: boolean = false

    async execute(state: AgentState<ImageInput, ImageOutput, ImageDomainState>): Promise<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        try {
            // Create output directory if it doesn't exist
            fs.mkdirSync(state.input.outputDir, { recursive: true })

            // Create subdirectories for different outputs
            const dirs = [
                'images',
                'logs',
                'errors'
            ]

            for (const dir of dirs) {
                fs.mkdirSync(path.join(state.input.outputDir, dir), { recursive: true })
            }

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'running'
                },
                agentRun: {
                    ...state.agentRun,
                    outputDir: state.input.outputDir,
                    inputDir: state.input.inputDir
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'failed'
                },
                errors: {
                    ...state.errors,
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 