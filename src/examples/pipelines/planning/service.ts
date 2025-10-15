/**
 * @file Service implementation for the PlanningPipeline
 * @module ea/pipelines/planning/service
 */

import { Cause, Effect } from "effect";
import type {
    PlanningPipelineApi,
    PlanningPipelineInput,
    PlanningPipelineOutput, 
    PlanStep
} from "./contract.js";
import { PlanningPipelineError } from "./errors.js";
import type { TaskAnalysisResult } from "./types.js";

/**
 * Service for analyzing tasks
 */
export interface TaskAnalysisToolApi {
    readonly _tag: "TaskAnalysisTool"
    readonly analyzeTask: (task: string) => Effect.Effect<TaskAnalysisResult, never>
}

/**
 * Implementation of the TaskAnalysisTool service using Effect.Service pattern
 */
export class TaskAnalysisTool extends Effect.Service<TaskAnalysisToolApi>()("TaskAnalysisTool", {
    effect: Effect.succeed({
        _tag: "TaskAnalysisTool" as const,
        analyzeTask: (_task: string): Effect.Effect<TaskAnalysisResult, never> => {
            // Mock implementation - replace with real task analysis
            return Effect.succeed({
                complexity: "medium",
                estimatedTime: "2 hours",
                dependencies: [],
                risks: ["potential scope creep"],
                recommendations: ["break down into smaller tasks"]
            });
        }
    }),
    dependencies: []
}) { }

/**
 * Implementation of the PlanningPipeline service
 */
export class PlanningPipelineService extends Effect.Service<PlanningPipelineApi>()("PlanningPipeline", {
    effect: Effect.gen(function* () {
        // Yield dependencies
        const taskAnalysis = yield* TaskAnalysisTool;

        // Helper to generate a unique ID for plan steps
        const generateStepId = (index: number, prefix = "step"): string =>
            `${prefix}-${index + 1}`;

        // Method implementations
        const createPlan = (input: PlanningPipelineInput): Effect.Effect<PlanningPipelineOutput, PlanningPipelineError> =>
            Effect.gen(function* () {
                yield* Effect.logInfo(`Creating plan for goal: ${input.goal}`);

                // Analyze the task first
                const analysis = yield* taskAnalysis.analyzeTask(input.goal);

                // TODO: Replace with actual Phoenix MCP server call
                // For now, using mock plan steps
                const mockSteps: PlanStep[] = [
                    {
                        id: generateStepId(0),
                        description: "Analyze requirements and constraints",
                        expectedOutput: "Detailed understanding of the problem",
                        estimatedTimeMinutes: 30,
                        tools: ["documentation", "analysis"]
                    },
                    {
                        id: generateStepId(1),
                        description: "Identify necessary resources",
                        expectedOutput: "List of resources needed",
                        dependsOn: [generateStepId(0)],
                        estimatedTimeMinutes: 20,
                        tools: ["research"]
                    },
                    {
                        id: generateStepId(2),
                        description: "Develop implementation strategy",
                        expectedOutput: "Detailed action plan",
                        dependsOn: [generateStepId(1)],
                        estimatedTimeMinutes: 45,
                        tools: ["planning", "visualization"],
                        subSteps: [
                            {
                                id: `${generateStepId(2)}-sub-1`,
                                description: "Define milestones",
                                estimatedTimeMinutes: 15
                            },
                            {
                                id: `${generateStepId(2)}-sub-2`,
                                description: "Allocate resources",
                                dependsOn: [`${generateStepId(2)}-sub-1`],
                                estimatedTimeMinutes: 15
                            }
                        ]
                    }
                ];

                // Calculate total estimated time
                const totalTime = mockSteps.reduce((total, step) => {
                    const stepTime = step.estimatedTimeMinutes || 0;
                    const subStepsTime = (step.subSteps || []).reduce(
                        (subTotal, subStep) => subTotal + (subStep.estimatedTimeMinutes || 0),
                        0
                    );
                    return total + stepTime + subStepsTime;
                }, 0);

                return {
                    summary: `Plan to achieve: ${input.goal}`,
                    steps: mockSteps,
                    expectedOutcome: "Successfully completed goal with all requirements met",
                    risks: [
                        ...analysis.risks,
                        "Potential time overruns if resources are limited",
                        "Technical challenges may arise during implementation"
                    ],
                    alternatives: [
                        {
                            description: "Alternative approach using different methodology",
                            pros: ["Potentially faster", "Less resource intensive"],
                            cons: ["Higher risk", "Less comprehensive"]
                        }
                    ],
                    estimatedTotalTimeMinutes: totalTime
                };
            }).pipe(
                Effect.catchAllCause(causeObject => {
                    const underlyingError = Cause.squash(causeObject);
                    return Effect.fail(new PlanningPipelineError({
                        message: `Failed to create plan: ${underlyingError instanceof Error ? underlyingError.message : String(underlyingError)}`,
                        cause: underlyingError
                    }));
                })
            );

        const refinePlan = (
            existingPlan: PlanningPipelineOutput,
            updatedInput: Partial<PlanningPipelineInput>
        ): Effect.Effect<PlanningPipelineOutput, PlanningPipelineError> =>
            Effect.gen(function* () {
                yield* Effect.logInfo(`Refining existing plan with updated constraints`);

                // TODO: Replace with actual Phoenix MCP server call
                // For now, we\'ll add a refinement note and an extra step
                const refinedSteps = [...existingPlan.steps];

                // Add a new step if not already at max
                if (!updatedInput.maxSteps || refinedSteps.length < updatedInput.maxSteps) {
                    const lastStep = refinedSteps.length > 0 ? refinedSteps[refinedSteps.length - 1] : undefined;
                    refinedSteps.push({
                        id: generateStepId(refinedSteps.length),
                        description: "Additional refinement step based on updated constraints",
                        dependsOn: lastStep ? [lastStep.id] : [],
                        estimatedTimeMinutes: 25,
                        tools: ["analysis", "revision"]
                    });
                }

                // Recalculate total time
                const totalTime = refinedSteps.reduce((total, step) => {
                    const stepTime = step.estimatedTimeMinutes || 0;
                    const subStepsTime = (step.subSteps || []).reduce(
                        (subTotal, subStep) => subTotal + (subStep.estimatedTimeMinutes || 0),
                        0
                    );
                    return total + stepTime + subStepsTime;
                }, 0);

                return {
                    ...existingPlan,
                    summary: `Refined plan: ${existingPlan.summary} (updated with new constraints)`,
                    steps: refinedSteps,
                    estimatedTotalTimeMinutes: totalTime
                };
            }).pipe(
                Effect.catchAllCause(causeObject => {
                    const underlyingError = Cause.squash(causeObject);
                    return Effect.fail(new PlanningPipelineError({
                        message: `Failed to refine plan: ${underlyingError instanceof Error ? underlyingError.message : String(underlyingError)}`,
                        cause: underlyingError
                    }));
                })
            );

        // Return implementation of the API
        return {
            createPlan,
            refinePlan
        };
    })
}) { }

/**
 * Layer for the PlanningPipeline service
 */
export const PlanningPipelineLayer = PlanningPipelineService; 