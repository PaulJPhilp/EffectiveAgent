import { randomUUID } from 'crypto'
import { join } from 'path'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { readdir } from 'fs/promises'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { BaseProfile } from '../../types.js'
import type { NormalizingAgentState } from '../types.js'

/**
 * Node for loading and processing PDF files
 */
export class LoadProfilesNode extends AgentNode<NormalizingAgentState> {
    public readonly name = 'load_profiles'
    public readonly description = 'Loads and processes PDF files from input directory'

    /**
     * Loads a single PDF file and extracts its content
     * @param filePath Path to the PDF file
     * @returns Profile data object
     */
    private async loadPdfFile(filePath: string): Promise<BaseProfile> {
        try {
            const loader = new PDFLoader(filePath)
            const docs = await loader.load()
            const content = docs.map(doc => doc.pageContent).join('\n')

            return {
                id: randomUUID(),
                sourceFile: filePath,
                content,
                metadata: {
                    sourceFile: filePath,
                    loadedAt: new Date().toISOString()
                }
            }
        } catch (error) {
            throw new Error(`Failed to load PDF file ${filePath}: ${error}`)
        }
    }

    /**
     * Executes the node's logic
     * @param state Current agent state
     * @returns Updated agent state
     */
    public async execute(state: NormalizingAgentState): Promise<NormalizingAgentState> {
        try {
            const { inputDir } = state.input
            const files = await readdir(inputDir, { withFileTypes: true })
            const pdfFiles = files.filter(file => file.isFile() && file.name.endsWith('.pdf'))

            if (pdfFiles.length === 0) {
                throw new Error(`No PDF files found in ${inputDir}`)
            }

            const profiles = await Promise.all(
                pdfFiles.map(file => this.loadPdfFile(join(inputDir, file.name)))
            )

            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'running'
                },
                agentState: {
                    ...state.agentState,
                    profiles
                },
                logs: {
                    ...state.logs,
                    logs: [...state.logs.logs, `Loaded ${profiles.length} PDF files`],
                    logCount: state.logs.logCount + 1
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'error'
                },
                errors: {
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 