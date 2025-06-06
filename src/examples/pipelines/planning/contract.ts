/**
 * @file Contract definition for the PlanningPipeline
 * @module ea/pipelines/planning/contract
 */

import { Context, Effect } from "effect";
import { PlanningPipelineError } from "./errors.js";

/**
 * Represents a single step in a plan
 */
export interface PlanStep {
    /** Unique identifier for this step */
    id: string;
    /** Description of what this step accomplishes */
    description: string;
    /** Expected output of this step */
    expectedOutput?: string;
    /** Dependencies on other steps (their IDs) */
    dependsOn?: string[];
    /** Estimated completion time in minutes */
    estimatedTimeMinutes?: number;
    /** Tools or resources needed for this step */
    tools?: string[];
    /** Optional substeps */
    subSteps?: PlanStep[];
}

/**
 * Input parameters for the PlanningPipeline
 */
export interface PlanningPipelineInput {
    /** Goal or objective to create a plan for */
    goal: string;
    /** Constraints to consider in the planning */
    constraints?: string[];
    /** Available tools or resources */
    availableTools?: string[];
    /** Desired level of plan detail */
    detailLevel?: "high" | "medium" | "low";
    /** Maximum steps in the plan */
    maxSteps?: number;
    /** Additional context information */
    context?: string;
}

/**
 * Response from the PlanningPipeline
 */
export interface PlanningPipelineOutput {
    /** Summary of the generated plan */
    summary: string;
    /** The ordered steps of the plan */
    steps: PlanStep[];
    /** Expected outcome of following the plan */
    expectedOutcome: string;
    /** Potential risks or challenges */
    risks?: string[];
    /** Alternative approaches considered */
    alternatives?: Array<{
        description: string;
        pros: string[];
        cons: string[];
    }>;
    /** Estimated total completion time in minutes */
    estimatedTotalTimeMinutes?: number;
}

/**
 * API contract for the PlanningPipeline service
 */
export interface PlanningPipelineApi {
    /**
     * Generates a structured plan for achieving a specified goal
     * 
     * @param input - Planning request parameters
     * @returns Effect that resolves to a structured plan or fails with pipeline error
     */
    createPlan: (
        input: PlanningPipelineInput
    ) => Effect.Effect<PlanningPipelineOutput, PlanningPipelineError>;

    /**
     * Refines an existing plan with updated constraints or information
     * 
     * @param existingPlan - The current plan to refine
     * @param updatedInput - Updated planning parameters
     * @returns Effect that resolves to a refined plan
     */
    refinePlan: (
        existingPlan: PlanningPipelineOutput,
        updatedInput: Partial<PlanningPipelineInput>
    ) => Effect.Effect<PlanningPipelineOutput, PlanningPipelineError>;
}

/**
 * Service tag for the PlanningPipeline
 */
export class PlanningPipeline extends Context.Tag("PlanningPipeline")<
    PlanningPipeline,
    PlanningPipelineApi
>() { } 