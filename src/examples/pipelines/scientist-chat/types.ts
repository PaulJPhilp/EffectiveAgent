/**
 * @file Type definitions for the scientist chat pipeline
 */

export interface ResearchData {
    readonly title: string
    readonly abstract: string
    readonly source: string
    readonly year: number
}

export interface CitationData {
    readonly citation: string
    readonly style: string
} 