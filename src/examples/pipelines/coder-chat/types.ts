/**
 * @file Defines types specific to the CoderChatPipeline.
 * @module ea/pipelines/coder-chat/types
 */

/**
 * Represents the result of a language analysis operation.
 */
export interface LanguageAnalysis {
    readonly language: string;
    readonly complexity: "low" | "medium" | "high" | string; // string for flexibility if other values
    readonly suggestions: readonly string[];
    readonly bestPractices: readonly string[];
    readonly potentialIssues: readonly string[];
} 