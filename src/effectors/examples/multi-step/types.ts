import { AgentRuntimeId } from "@/agent-runtime/index.js"

export type MultiStepId = AgentRuntimeId

/**
 * Available commands for controlling the multi-step task
 */
export const MultiStepCommand = {
    START_TASK: 'START_TASK',
    PAUSE_TASK: 'PAUSE_TASK',
    RESUME_TASK: 'RESUME_TASK'
} as const

export type MultiStepCommand = typeof MultiStepCommand[keyof typeof MultiStepCommand]

/**
 * Configuration for a multi-step task
 */
export interface MultiStepConfig {
    /** Total number of steps to process */
    readonly totalSteps?: number
    /** Delay between steps in milliseconds */
    readonly stepDelayMs?: number
    /** Probability of step failure (0-1) */
    readonly failureProbability?: number
}

/**
 * Status of a step in the task
 */
export type StepStatus = "pending" | "processing" | "completed" | "failed"

/**
 * State for tracking an individual step
 */
export interface StepState {
    /** Current status of the step */
    readonly status: StepStatus
    /** When the step started */
    readonly startedAt?: number
    /** When the step completed */
    readonly completedAt?: number
    /** Any error that occurred */
    readonly error?: Error
    /** Result data if successful */
    readonly result?: unknown
}

/**
 * State managed by the Multi-Step Task Runtime
 */
export interface MultiStepState {
    /** The unique identifier for this task */
    readonly id: MultiStepId
    /** The current step number (0-based) */
    readonly currentStep: number
    /** State for each step */
    readonly steps: Record<number, StepState>
    /** Configuration for this task */
    readonly config: Required<MultiStepConfig>
    /** When the task started */
    readonly startedAt?: number
    /** When the task completed */
    readonly completedAt?: number
    /** Whether the task is currently paused */
    readonly paused?: boolean
    /** Any error that caused the task to fail */
    readonly error?: Error
}

/**
 * Creates a new Multi-Step Task Runtime ID
 */
export const makeMultiStepId = (id: string): AgentRuntimeId =>
    `multi-step-${id}` as AgentRuntimeId

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<MultiStepConfig> = {
    totalSteps: 3,
    stepDelayMs: 1000,
    failureProbability: 0
}