/**
 * Task execution result
 */
export interface TaskExecutionResult {
  readonly output: string;
}

/**
 * Task interface
 */
export interface Task {
  readonly taskName: string;
  readonly primaryModelId: string;
  readonly execute: (input: Record<string, unknown>) => Promise<TaskExecutionResult>;
}
