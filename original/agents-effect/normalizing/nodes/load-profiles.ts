import { join } from "path"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { Effect } from "effect"
import { readdir } from "fs/promises"
import type { BaseProfile } from "../../../agents/types.js"
import type { LoadProfilesEffect } from "../types.js"
import { ProfileLoadError } from "../types.js"

interface Document {
    pageContent: string
    metadata: Record<string, unknown>
}

/**
 * Loads PDF files from the input directory and converts them to BaseProfiles
 */
export function loadProfiles(inputDir: string): LoadProfilesEffect {
    return Effect.tryPromise({
        try: async () => {
            const files = await readdir(inputDir, { withFileTypes: true })
            const pdfFiles = files.filter(file => file.isFile() && file.name.endsWith(".pdf"))

            if (pdfFiles.length === 0) {
                throw new ProfileLoadError("No PDF files found", inputDir)
            }

            return pdfFiles.map(file => ({
                id: crypto.randomUUID(),
                sourceFile: join(inputDir, file.name),
                content: "",
                metadata: {
                    sourceFile: join(inputDir, file.name),
                    loadedAt: new Date().toISOString()
                }
            } as BaseProfile))
        },
        catch: error => new ProfileLoadError("Failed to read input directory", inputDir, error)
    })
}

/**
 * Loads a single PDF file and converts it to a BaseProfile
 */
function loadPdfFile(filePath: string): Effect.Effect<BaseProfile, ProfileLoadError> {
    return Effect.gen(function* () {
        // Create PDF loader
        const loader = new PDFLoader(filePath)

        // Load and extract content
        const docs: Document[] = yield* Effect.tryPromise({
            try: () => loader.load(),
            catch: (error) => new ProfileLoadError("Failed to load PDF", filePath, error)
        })

        // Combine page content
        const content = docs.map(doc => doc.pageContent).join("\n")

        // Create profile
        return {
            id: crypto.randomUUID(),
            sourceFile: filePath,
            content,
            metadata: {
                sourceFile: filePath,
                loadedAt: new Date().toISOString()
            }
        }
    })
} 