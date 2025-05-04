import { EffectorId } from "../../effector/types.js"

export type MultiStepId = EffectorId

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
    /** Number of steps to process (default: 3) */
    totalSteps?: number
    /** Delay between steps in milliseconds (default: 1000) */
    stepDelayMs?: number
    /** Probability of step failure (0-1, default: 0) */
    failureProbability?: number
}

/**
 * Status of a step in the task
 */
export type StepStatus = "pending" | "processing" | "completed" | "failed"

/**
 * State for tracking an individual step
 */
export interface StepState {
    status: StepStatus
    startedAt?: number
    completedAt?: number
    error?: unknown
}

/**
 * State managed by the Multi-Step Task Effector
 */
export interface MultiStepState {
    /** The effector's ID */
    id: EffectorId
    /** Current configuration */
    config: Required<MultiStepConfig>
    /** Current step number (1-based) */
    currentStep: number
    /** Status of each step */
    steps: Record<number, StepState>
    /** Last operation performed */
    lastOperation?: MultiStepCommand
    /** Error information if task failed */
    error?: unknown
}

/**
 * Creates a new Multi-Step Task Effector ID
 */
export const makeMultiStepId = (id: string): EffectorId =>
    `multi-step-${id}` as EffectorId

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<MultiStepConfig> = {
    totalSteps: 3,
    stepDelayMs: 1000,
    failureProbability: 0
}