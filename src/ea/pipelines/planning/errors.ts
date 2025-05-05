/**
 * @file Error definitions for the PlanningPipeline
 * @module ea/pipelines/planning/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the PlanningPipeline when goal analysis fails
 */
export class GoalAnalysisError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "PlanningPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the PlanningPipeline when step generation fails
 */
export class StepGenerationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "PlanningPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the PlanningPipeline when step dependency resolution fails
 */
export class DependencyResolutionError extends PipelineError {
    readonly stepId: string;
    readonly dependencyIds: string[];

    constructor(params: { message: string; stepId: string; dependencyIds: string[]; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "PlanningPipeline",
            cause: params.cause
        });
        this.stepId = params.stepId;
        this.dependencyIds = params.dependencyIds;
    }
}

/**
 * Error specific to the PlanningPipeline when plan validation fails
 */
export class PlanValidationError extends PipelineError {
    readonly validationIssues: string[];

    constructor(params: { message: string; validationIssues: string[]; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "PlanningPipeline",
            cause: params.cause
        });
        this.validationIssues = params.validationIssues;
    }
}

/**
 * Union type of all PlanningPipeline error types
 */
export type PlanningPipelineError =
    | GoalAnalysisError
    | StepGenerationError
    | DependencyResolutionError
    | PlanValidationError; 