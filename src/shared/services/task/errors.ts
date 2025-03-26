/**
 * Base error class for task service errors
 */
export class TaskError extends Error {
    readonly code: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'TaskError';
        this.code = code;
    }
}

/**
 * Error thrown when task service fails to initialize
 */
export class TaskServiceError extends TaskError {
    readonly originalError?: Error;

    constructor(message: string, originalError?: Error) {
        super(message, 'TASK_SERVICE_INITIALIZATION_ERROR');
        this.name = 'TaskServiceError';
        this.originalError = originalError;
    }
}

/**
 * Error thrown when a task is not found
 */
export class TaskNotFoundError extends TaskError {
    readonly taskName: string;

    constructor(taskName: string) {
        super(`Task not found: ${taskName}`, 'TASK_NOT_FOUND');
        this.name = 'TaskNotFoundError';
        this.taskName = taskName;
    }
}

/**
 * Error thrown when a task configuration is invalid
 */
export class TaskConfigurationError extends TaskError {
    readonly invalidFields: string[];

    constructor(message: string, invalidFields: string[] = []) {
        super(message, 'TASK_CONFIGURATION_ERROR');
        this.name = 'TaskConfigurationError';
        this.invalidFields = invalidFields;
    }
}

/**
 * Error thrown when task execution fails
 */
export class TaskExecutionError extends TaskError {
    readonly taskName: string;
    readonly originalError?: Error;

    constructor(taskName: string, message: string, originalError?: Error) {
        super(`Error executing task ${taskName}: ${message}`, 'TASK_EXECUTION_ERROR');
        this.name = 'TaskExecutionError';
        this.taskName = taskName;
        this.originalError = originalError;
    }
}

/**
 * Error thrown when prompt generation for a task fails
 */
export class TaskPromptError extends TaskError {
    readonly taskName: string;
    readonly promptName: string;
    readonly originalError?: Error;

    constructor(taskName: string, promptName: string, message: string, originalError?: Error) {
        super(`Error generating prompt "${promptName}" for task "${taskName}": ${message}`, 'TASK_PROMPT_ERROR');
        this.name = 'TaskPromptError';
        this.taskName = taskName;
        this.promptName = promptName;
        this.originalError = originalError;
    }
}

/**
 * Error thrown when model completion for a task fails
 */
export class TaskModelError extends TaskError {
    readonly taskName: string;
    readonly modelId: string;
    readonly originalError?: Error;

    constructor(taskName: string, modelId: string, message: string, originalError?: Error) {
        super(`Error with model "${modelId}" for task "${taskName}": ${message}`, 'TASK_MODEL_ERROR');
        this.name = 'TaskModelError';
        this.taskName = taskName;
        this.modelId = modelId;
        this.originalError = originalError;
    }
} 