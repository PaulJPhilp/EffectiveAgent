import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
    BaseMessage,
    MessageContent,
    MessageContentComplex,
} from "@langchain/core/messages";
import { initChatModel } from "langchain/chat_models/universal";
import type { Document } from "langchain/document";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import * as fs from "node:fs";
import * as path from "node:path";
import type { FileGroup, PdfFile, ProfileData, RunInfo } from "./types.ts";

/**
 * Helper function to extract text content from a complex message.
 *
 * @param content - The complex message content to process
 * @returns The extracted text content
 */
function getSingleTextContent(content: MessageContentComplex) {
    if (content?.type === "text") {
        return content.text;
    }
    if (content.type === "array") {
        return content.content.map(getSingleTextContent).join(" ");
    }
    return "";
}

/**
 * Helper function to extract text content from various message types.
 *
 * @param content - The message content to process
 * @returns The extracted text content
 */
export function getTextContent(content: MessageContent): string {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content.map(getSingleTextContent).join(" ");
    }
    return "";
}

/**
 * Load a chat model from a fully specified name.
 * @param modelName - String in the format 'provider/model' or 'provider/account/provider/model'.
 * @returns A Promise that resolves to a BaseChatModel instance.
 */
export async function loadChatModel(modelName: string): Promise<BaseChatModel> {
    try {
        console.log(`[MODEL] Loading chat model: ${modelName}`);

        // Use a local variable instead of modifying the parameter
        let effectiveModelName = modelName;

        if (!effectiveModelName) {
            console.error("[MODEL] ERROR: Model name is undefined or empty");
            // Default to a standard model if none specified
            effectiveModelName = "openai/gpt-3.5-turbo-0125";
            console.log(`[MODEL] Using default model: ${effectiveModelName}`);
        }

        const index = effectiveModelName.indexOf("/");
        if (index === -1) {
            // If there's no "/", assume it's just the model
            console.log(
                `[MODEL] No provider specified, using default provider for: ${effectiveModelName}`,
            );
            const model = await initChatModel(effectiveModelName);
            console.log(`[MODEL] Successfully loaded model: ${effectiveModelName}`);
            return model;
        }

        const provider = effectiveModelName.slice(0, index);
        const model = effectiveModelName.slice(index + 1);
        console.log(`[MODEL] Loading model ${model} from provider ${provider}`);

        const chatModel = await initChatModel(model, { modelProvider: provider });
        console.log(
            `[MODEL] Successfully loaded model ${model} from provider ${provider}`,
        );
        return chatModel;
    } catch (error: unknown) {
        console.error("[MODEL] ERROR loading chat model:", error);
        // Re-throw the error to be handled by the caller
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load chat model: ${errorMessage}`);
    }
}

export function isPdfFile(file: Document): boolean {
    return file.metadata?.pdf !== undefined;
}

export function isTxtFile(file: Document): boolean {
    return file.metadata?.source.endsWith(".txt");
}

function groupByType(items: Document[]): FileGroup {

    return items.reduce((groups, file) => {
        const type = isPdfFile(file) ? "pdf" : "txt";
        groups[type] = groups[type] || [];
        if (file.pageContent) {
            groups[type].push({
                pageContent: file.pageContent,
                metadata: file.metadata ?? {},
                id: file?.id
            } as Document);
        }
        return groups;
    }, {} as FileGroup);
}

export async function loadFiles(path: string): Promise<FileGroup> {
    try {
        console.log(`[FILES] Loading files from directory: ${path}`);

        // Check if path exists
        if (!fs.existsSync(path)) {
            console.error(`[FILES] ERROR: Directory does not exist: ${path}`);
            // Return empty arrays instead of throwing to prevent crashes
            return { pdf: [], txt: [] };
        }

        /* Load all PDFs within the specified directory */
        const directoryLoader = new DirectoryLoader(path, {
            ".pdf": (path: string) => new PDFLoader(path, { splitPages: false }),
            ".txt": (path: string) => {
                const loader = new TextLoader(path);
                return loader;
            },
        });

        console.log(`[FILES] Starting to load documents from ${path}`);
        const docs = await directoryLoader.load();
        for (const doc of docs) {
            doc.id = extractPersonNameFromPath(doc.metadata.source)
        }
        console.log(`[FILES] Loaded ${docs.length} documents total`);

        const groupedDocs = groupByType(docs);
        console.log(
            `[FILES] Grouped documents: ${groupedDocs.pdf?.length ?? 0} PDFs, ${groupedDocs.txt?.length ?? 0} TXTs`,
        );
        return groupedDocs;
    } catch (error) {
        console.error("[FILES] ERROR in loadFiles:", error);
        // Return empty arrays instead of throwing to prevent crashes
        return { pdf: [], txt: [] };
    }
}

/**
 * Checks if a number is even
 *
 * @param num - The number to check
 * @returns True if the number is even, false otherwise
 */
export function isEven(num: number): boolean {
    return num % 2 === 0;
}

/**
 * Checks if a number is odd
 *
 * @param num - The number to check
 * @returns True if the number is odd, false otherwise
 */
export function isOdd(num: number): boolean {
    return !isEven(num);
}

/**
 * Extracts a person's name from a file path
 * Assumes the file name format is Name_Name_Profile.extension
 *
 * @param filePath - The full file path
 * @returns The person's name with spaces instead of underscores
 */
export function extractPersonNameFromPath(filePath: string): string {
    // Get the file name from the path
    const fileName = filePath.split("/").pop() || "";

    // Remove the file extension and '_Profile' suffix
    const nameWithUnderscores = fileName
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/_Profile$/, ""); // Remove _Profile suffix

    // Replace underscores with spaces
    return nameWithUnderscores.replace(/_/g, " ");
}

/**
 * Logs profile parsing errors to a file for later analysis
 *
 * @param profileName - Name or identifier of the profile (or file path if name unknown)
 * @param sourceType - Source of the profile (PDF or TXT)
 * @param errorMessage - Error message describing what went wrong
 * @param problematicData - The data that failed to parse
 * @param filePath - Optional specific file path to log to
 */
export function logParsingError(
    profileName: string,
    sourceType: "PDF" | "TXT",
    errorMessage: string,
    problematicData: unknown,
    filePath = "./logs/parsing_errors.log",
): void {
    // Create logs directory if it doesn't exist
    const logDir = path.dirname(filePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const errorEntry = {
        timestamp,
        profileName,
        sourceType,
        errorMessage,
        problematicData,
    };

    // Format the log entry
    const logEntry = `
---------- ERROR ENTRY ${timestamp} ----------
Profile: ${profileName}
Source Type: ${sourceType}
Error: ${errorMessage}
Data: ${JSON.stringify(problematicData, null, 2)}
----------------------------------------------
`;

    // Append to log file
    fs.appendFileSync(filePath, logEntry);
    console.error(
        `Parsing error logged for ${profileName} from ${sourceType} source`,
    );
}

export function logProfile(
    profileName: string,
    sourceType: "PDF" | "TXT" | "MERGED",
    profile: ProfileData,
    profileType: "clean" | "merged" | "normalized",
    filePath = "./data",
): void {
    const dirPath = `${filePath}/${profileType}/${profileName}`;

    const fileName = `${dirPath}/${profileName}.${sourceType.toLowerCase()}.txt`;
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(fileName, JSON.stringify(profile, null, 3));
}

/**
 * Normalize a profile name for consistent usage across the application
 *
 * This function:
 * 1. Trims whitespace
 * 2. Normalizes spacing (removes extra spaces)
 * 3. Properly capitalizes name parts
 * 4. Handles special cases like "MBA" or "PhD" suffixes
 *
 * @param name - The profile name to normalize
 * @returns The normalized name
 */
export function normalizeProfileName(name: string): string {
    if (!name) return "";

    // Trim whitespace and normalize spaces (remove multiple spaces)
    let normalized = name.trim().replace(/\s+/g, " ");

    // Remove parenthetical expressions
    normalized = normalized.replace(/\s*\([^)]*\)/g, "");

    // Handle special suffixes and common abbreviations
    const specialSuffixes = [
        "PhD",
        "MD",
        "JD",
        "MBA",
        "CPA",
        "PMP",
        "PE",
        "RN",
        "MSc",
        "MA",
        "MS",
        "BA",
        "BS",
        "BBA",
        "MFA",
        "EdD",
        "DDS",
        "DO",
        "RDN",
    ];

    // Handle "Last, First" format before other processing
    if (normalized.includes(",")) {
        const parts = normalized.split(",").map((part) => part.trim());

        // Check if it's a "Last, First" format (no suffixes)
        const isLastFirstFormat =
            parts.length === 2 &&
            !parts[1].includes(" ") && // Second part is a single word
            parts[0].split(" ").length <= 2 && // First part is at most two words
            !specialSuffixes.includes(parts[1].toUpperCase()); // Second part is not a suffix

        if (isLastFirstFormat) {
            // Reverse "Last, First" to "First Last"
            normalized = `${parts[1]} ${parts[0]}`;
        } else {
            // Keep only the part before the first comma (removing suffixes)
            normalized = parts[0];
        }
    }

    // First, capitalize all words in the name
    normalized = normalized
        .split(" ")
        .map((word) => {
            // Handle hyphenated names
            if (word.includes("-")) {
                return word
                    .split("-")
                    .map((part) => capitalizeWord(part))
                    .join("-");
            }
            // Special case for Irish and Scottish surnames
            if (
                word.toLowerCase().startsWith("o'") ||
                word.toLowerCase().startsWith("mc")
            ) {
                return (
                    word.charAt(0).toUpperCase() +
                    word.charAt(1).toLowerCase() +
                    word.charAt(2).toUpperCase() +
                    word.slice(3).toLowerCase()
                );
            }
            // Special case for Dutch/German "von", "van", "de"
            if (["von", "van", "de", "di", "du", "la"].includes(word.toLowerCase())) {
                return word.toLowerCase();
            }
            // Special case for professional titles with periods
            if (word.includes(".")) {
                return word; // Keep as is
            }
            // Regular capitalization
            return capitalizeWord(word);
        })
        .join(" ");

    return normalized;
}

/**
 * Helper function to capitalize a word
 *
 * @param word - The word to capitalize
 * @returns The capitalized word
 */
function capitalizeWord(word: string): string {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export class Logger {
    private logFile: string;
    private logStream: fs.WriteStream;

    constructor(filename = "agent.log") {
        // Ensure logs directory exists
        const logDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        this.logFile = path.join(logDir, filename);
        this.logStream = fs.createWriteStream(this.logFile, { flags: "a" });
    }

    private formatMessage(
        level: string,
        message: string,
        ...args: unknown[]
    ): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args
            .map((arg) =>
                typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
            )
            .join(" ");
        return (
            `[${timestamp}] [${level}] ${message} ${formattedArgs}\n`.trim()
        );
    }

    log(message: string, ...args: unknown[]): void {
        const formattedMessage = this.formatMessage("INFO", message, ...args);
        console.log(formattedMessage.trim());
        this.logStream.write(formattedMessage);
    }

    error(message: string, ...args: unknown[]): void {
        const formattedMessage = this.formatMessage("ERROR", message, ...args);
        console.error(formattedMessage.trim());
        this.logStream.write(formattedMessage);
    }

    warn(message: string, ...args: unknown[]): void {
        const formattedMessage = this.formatMessage("WARN", message, ...args);
        console.warn(formattedMessage.trim());
        this.logStream.write(formattedMessage);
    }

    debug(message: string, ...args: unknown[]): void {
        const formattedMessage = this.formatMessage("DEBUG", message, ...args);
        console.debug(formattedMessage.trim());
        this.logStream.write(formattedMessage);
    }

    close(): void {
        this.logStream.end();
    }
}

// Create a singleton instance
export const logger = new Logger();

/**
 * Log a message to both console and run log file
 */
export function logToRun(
    runInfo: RunInfo,
    message: string,
    level: "info" | "error" = "info"
): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}\n`

    // Log to console
    if (level === "error") {
        console.error(logMessage)
    } else {
        console.log(logMessage)
    }

    // Log to file
    const logDir = path.join(runInfo.outputDir, "logs")
    fs.mkdirSync(logDir, { recursive: true })

    const logFile = path.join(
        logDir,
        level === "error" ? "error.log" : "run.log"
    )
    fs.appendFileSync(logFile, logMessage)
}

/**
 * Extract JSON content from a string that may contain markdown or other text
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

    throw new Error("No JSON content found in response")
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms}ms`
    }
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
        const remainingSeconds = seconds % 60
        return `${minutes}m ${remainingSeconds}s`
    }
    return `${seconds}s`
}

/**
 * Generate a unique filename that doesn't conflict with existing files
 */
export function getUniqueFilename(
    directory: string,
    baseName: string,
    extension: string
): string {
    let counter = 0
    let filename = `${baseName}${extension}`

    while (fs.existsSync(path.join(directory, filename))) {
        counter++
        filename = `${baseName}_${counter}${extension}`
    }

    return filename
}
