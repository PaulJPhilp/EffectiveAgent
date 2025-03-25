import type { Document } from "langchain/document";
import type { z } from "zod";

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

export interface ExtractionSchema
    extends z.ZodObject<Record<string, z.ZodType>> { }

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

export interface ProfileData{
    name: string;
    title: string;
    location: string;
    key_skills: string[];
    contact: ContactInformation;
    certificates: Certificate[];
    experience: Experience[];
    sourceFile: string;
    fileText: string;
    fileType: FileType;
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
    profiles: ProfileData[]
    normalizedProfiles: ProfileData[]
    normalizationResults: NormalizationResult[]
    summary: NormalizationSummary
    completedSteps: string[]
    error: string
    logs: string[]
}
