import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatOpenAI } from '@langchain/openai'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import type { EvaluationState, RunConfig } from './types.js'

export async function loadChatModel(modelName: string): Promise<BaseChatModel> {
    // For simplicity, we're only supporting OpenAI models for now
    // to avoid type compatibility issues
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
export function extractJSON<T>(input: string): T | null {
    // Try to find JSON-like content between curly braces
    const jsonMatch = input.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return safeParseJSON<T>(jsonMatch[0])
}

/**
 * Save data to a JSON file
 */
export function saveToJSON(data: unknown, filePath: string): boolean {
    try {
        const directory = path.dirname(filePath)
        ensureDirectoryExists(directory)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
        return true
    } catch (error) {
        console.error(`Error saving to ${filePath}:`, error)
        return false
    }
}

/**
 * Save text to a file
 */
export function saveToFile(text: string, filePath: string): boolean {
    try {
        const directory = path.dirname(filePath)
        ensureDirectoryExists(directory)
        fs.writeFileSync(filePath, text)
        return true
    } catch (error) {
        console.error(`Error saving to ${filePath}:`, error)
        return false
    }
}

/**
 * Load a JSON file
 */
export function loadJSON<T>(filePath: string): T | null {
    try {
        if (!fs.existsSync(filePath)) return null
        const fileContent = fs.readFileSync(filePath, 'utf8')
        return safeParseJSON<T>(fileContent)
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error)
        return null
    }
}

/**
 * Generate a unique run ID
 */
export function generateRunId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomPart = Math.random().toString(36).substring(2, 10)
    return `run-${timestamp}-${randomPart}`
}

function extractJson(markdownText: string): string {
    // This regex will match triple backticks optionally followed by "json"
    // and capture everything in between
    const regex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = markdownText.match(regex);
    return match ? match[1] : markdownText.trim();
}

export function parseJsonFromMarkdown(markdownText: string): unknown {
    const jsonString = extractJson(markdownText);
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Invalid JSON format: ${error}`);
    }
}

// Log to run-specific log file
export function logToRun(
    runInfo: RunConfig,
    message: string,
    level: "info" | "error" | "warn" = "info",
): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    console.error(logEntry)

    // Check if runInfo is defined and has an outputDir
    if (runInfo?.outputDir) {
        // Append to log file
        const logFile = path.join(runInfo.outputDir, "logs", "run.log");
        fs.appendFileSync(logFile, logEntry);
    }
}

// Save run metadata
export function saveRunMetadata(runInfo: RunConfig): void {
    const metadata = {
        runId: runInfo.runId,
        startTime: runInfo.startTime.toISOString(),
        endTime: new Date().toISOString(),
        model: runInfo.model?.constructor.name,
        description: runInfo.description || "Persona generation run",
    };

    const metadataFile = path.join(runInfo.outputDir, "run-metadata.json");
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
}

export function validateEvaluateState(
    state: EvaluationState,
    where: string
) {
    assert(state !== undefined, `VALIDATION ERROR: NO STATE in ${where}`)

    // Only check for inputPersona.title in the early nodes
    if (where === "initializeRunNode()" || where === "elaboratePersonaNode()" || where === "evaluatePersonaNode()" || where === "processBaseClustersNode()") {
        assert(state.inputPersona !== undefined, `VALIDATION ERROR: NO INPUT PERSONA in ${where}`)
        assert(state.inputPersona.title !== undefined, `VALIDATION ERROR: NO INPUT PERSONA TITLE in ${where}`)
    }

    if (where === "evaluatePersonaNode()" || (where === "processBaseClustersNode()") || (where === "createFullProfilesNode()") || (where === "createExecutiveSummariesNode()")) {
        assert(state.elaboratedPersona !== undefined, `VALIDATION ERROR: NO ELABORATED PERSONA in ${where}`)
        assert(state.elaboratedPersona.title !== undefined, `VALIDATION ERROR: NO ELABORATED PERSONA TITLE in ${where}`)
    }

    assert(Array.isArray(state.recommendations), `VALIDATION ERROR: NO RECOMMENDATIONS ARRAY in ${where}`)
    console.log(`Validation Passed: ${where}`)
}
