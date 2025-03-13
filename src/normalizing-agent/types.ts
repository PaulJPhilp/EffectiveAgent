import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { Document } from "langchain/document";
import type { z } from "zod";

// biome-ignore lint/suspicious/noExplicitAny: Catching all errors
export type AnyRecord = Record<string, any>;

export type FileType = "pdf" | "text";
export interface FileGroup {
    pdf: Document[];
    txt: Document[];
}

export interface PdfFileInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    Title: string;
    Author: string;
    Subject: string;
    Producer: string;
    CreationDate: string;
}

export interface PdfFileMetadata {
    source: string;
    pdf: {
        version: string;
        totalPages: number;
        info: PdfFileInfo;
        metadata: Record<string, string>;
    };
}

export interface PdfFile {
    metadata?: {
        source?: string;
    };
    pageContent?: string;
}

export type MessageType = "user" | "system" | "tool" | "assistent";
export type ShouldContinue = { continue: boolean; reason?: string };

export interface MyState {
    user_id: string;
    message: string;
    email: string;
    data: FileGroup;
    completed: boolean;
    loopStep: number;
    extractionSchema: ExtractionSchema;
    messages: BaseMessage;
    shouldContinue: ShouldContinue;
    pdfCount: number;
    txtCouint: number;
    currentFile: PdfFile;
    activeTasks: number;
    personaClusters: ClusteringResult;
}

export interface DualProfiles {
    pdf?: Record<string, unknown>;
    txt?: Record<string, unknown>;
}

export interface ExtractionSchema
    extends z.ZodObject<Record<string, z.ZodType>> { }

export const MyStateAnnotation = Annotation.Root({
    user_id: Annotation<string>(),
    message: Annotation<string>(),
    email: Annotation<string>(),
    data: Annotation<FileGroup>(),
    completed: Annotation<boolean>(),
    loopStep: Annotation<number>(),
    extractionSchema: Annotation<ExtractionSchema>(),
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    shouldContinue: Annotation<ShouldContinue>(),
    pdfCount: Annotation<number>(),
    txtCount: Annotation<number>(),
    currentPdfFile: Annotation<PdfFile>(),
    currentTxtFile: Annotation<PdfFile>(),
    profiles: Annotation<Map<string, DualProfiles>>(),
    personaClusters: Annotation<ClusteringResult>(),
});

export const DataCleaningModel = "openai/gpt-4o-mini";

export interface Duration {
    start_date: string;
    end_date: string | null;
    date_range: string;
}

export interface ContactInformation {
    email: string | null;
    linkedin: string | null;
    company_website: string | null;
}

export interface Certificate {
    status: "Active" | "Expired" | "In Progress";
    name: string;
    issuing_organization: string;
    issue_date: string | null;
    expiration_date: string | null;
    credential_id: string | null;
}

export interface Experience {
    company: string;
    title: string;
    duration: string;
    description: string[];
}

export interface ProfileData extends Record<string, unknown> {
    name: string;
    title: string;
    location: string | null;
    key_skills: string[];
    contact: ContactInformation;
    certificates: Certificate[];
    experience: Experience[];
    sourceFile?: string;
}

// Schema for a single persona cluster
export interface PersonaCluster {
    name: string;
    description: string;
    commonCharacteristics: string[];
    skills: string[];
    typicalBackground: string;
    percentageOfTotal: number;
    representativeProfiles: string[];
}

// Schema for the complete clustering result
export interface ClusteringResult {
    clusters: PersonaCluster[];
    analysis: string;
    totalProfiles: number;
    date: string;
}

/**
 * Information about the current normalization run
 */
export interface RunInfo {
    runId: string
    startTime: string
    outputDir: string
}

/**
 * Raw profile data structure
 */
export interface ProfileData {
    name: string
    age?: number
    location?: string
    occupation?: string
    interests?: string[]
    skills?: string[]
    education?: string[]
    experience?: string[]
    bio?: string
    [key: string]: unknown
}

/**
 * Result of normalizing a single profile
 */
export interface NormalizationResult {
    success: boolean
    profileName: string
    normalizedProfile?: ProfileData
    error?: string
}

/**
 * Summary of normalization results
 */
export interface NormalizationSummary {
    totalProfiles: number
    successfulNormalizations: number
    failedNormalizations: number
    errors: Array<{
        profileName: string
        error: string
    }>
}

/**
 * Status of the normalization process
 */
export type NormalizationStatus =
    | 'initializing'
    | 'loading_profiles'
    | 'profiles_loaded'
    | 'normalizing_profiles'
    | 'profiles_normalized'
    | 'saving_results'
    | 'complete'
    | 'error'

/**
 * State maintained throughout the normalization process
 */
export interface NormalizationState {
    runInfo: RunInfo
    status: NormalizationStatus
    profiles?: ProfileData[]
    normalizedProfiles?: ProfileData[]
    normalizationResults?: NormalizationResult[]
    summary?: NormalizationSummary
    completedSteps?: string[]
    error?: string
    logs?: string[]
}
