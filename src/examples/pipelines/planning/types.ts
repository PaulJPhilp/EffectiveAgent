/**
 * @file Type definitions for the planning pipeline
 */

export interface TaskAnalysisResult {
    readonly complexity: string
    readonly estimatedTime: string
    readonly dependencies: string[]
    readonly risks: string[]
    readonly recommendations: string[]
} 