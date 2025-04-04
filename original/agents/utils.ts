import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatOpenAI } from '@langchain/openai'
import fs from 'node:fs'
import path from 'node:path'
import type { RunConfig } from './types.js'

/**
 * Split an array into chunks of a specified size
 */
export function chunkArray<T>(array: readonly T[], chunkSize: number): readonly T[][] {
    if (chunkSize <= 0) {
        throw new Error('chunkSize must be a positive number')
    }
    const result: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize))
    }
    return result
}

/**
 * Load a chat model instance
 */
export async function loadChatModel(modelName: string): Promise<BaseChatModel> {
    return new ChatOpenAI({
        modelName: modelName || 'gpt-4-turbo',
        temperature: 0.2
    })
}

/**
 * Ensure a directory exists
 */
export function ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

/**
 * Create a safe filename from a string
 */
export function createSafeFilename(input: string): string {
    return input.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') // Trim underscores from start and end
}

/**
 * Parse JSON from a string, with error handling
 */
export function safeParseJSON<T>(input: string): T | null {
    try {
        return JSON.parse(input) as T
    } catch (error) {
        console.error('Error parsing JSON:', error)
        return null
    }
}

/**
 * Extract JSON from a string response
 */
export function extractJsonFromResponse(content: string): string {
    // Try to find JSON content within code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim()
    }

    // Try to find JSON content between curly braces
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
        return jsonMatch[0].trim()
    }

    throw new Error('No JSON content found in response')
}

/**
 * Save data to a JSON file
 */
export function saveToJSON(data: unknown, filePath: string): boolean {
    try {
        const jsonString = JSON.stringify(data, null, 2)
        fs.writeFileSync(filePath, jsonString, 'utf8')
        return true
    } catch (error) {
        console.error('Error saving JSON:', error)
        return false
    }
}

/**
 * Save text to a file
 */
export function saveToFile(text: string, filePath: string): boolean {
    try {
        fs.writeFileSync(filePath, text, 'utf8')
        return true
    } catch (error) {
        console.error('Error saving file:', error)
        return false
    }
}

/**
 * Load a JSON file
 */
export function loadJSON<T>(filePath: string): T | null {
    try {
        const content = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(content) as T
    } catch (error) {
        console.error('Error loading JSON:', error)
        return null
    }
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Log to run-specific log file
 */
export function logToRun(
    runInfo: RunConfig,
    message: string,
    level: 'info' | 'error' | 'warn' = 'info',
): void {
    const logPath = path.join(runInfo.outputDir, 'run.log')
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`
    fs.appendFileSync(logPath, logMessage)
}

/**
 * Save run metadata
 */
export function saveRunMetadata(runInfo: RunConfig): void {
    const metadataPath = path.join(runInfo.outputDir, 'metadata.json')
    saveToJSON(runInfo, metadataPath)
}