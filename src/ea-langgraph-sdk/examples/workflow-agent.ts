/**
 * Sample Workflow Agent implementation using EA SDK
 * @file Demonstrates complex workflow management with EA integration
 *
 * This example shows how to:
 * - Manage complex multi-step workflows
 * - Use EA SDK for file operations and tool execution
 * - Handle parallel and sequential task execution
 * - Implement rollback and error recovery
 * - Create comprehensive activity tracking
 */

import { Effect } from "effect";
import type { AgentRuntimeServiceApi } from "../api.js";
import {
  createActivity,
  createStateTransformer,
  getStateProperty,
  runEffect,
  setStateProperty,
  validateStateStructure,
  wrapLangGraphNode,
} from "../helpers.js";
import type { LangGraphAgentState } from "../types.js";

// Define workflow task types
type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";
type TaskType =
  | "file_operation"
  | "api_call"
  | "data_processing"
  | "validation"
  | "notification";

interface WorkflowTask {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  dependencies: string[]; // Task IDs this task depends on
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startTime?: number;
  endTime?: number;
  retryCount: number;
  maxRetries: number;
}

interface WorkflowAgentState
  extends LangGraphAgentState<{
    workflowId: string;
    userId: string;
    orgId?: string;
  }> {
  workflow: {
    id: string;
    name: string;
    status:
      | "initializing"
      | "running"
      | "paused"
      | "completed"
      | "failed"
      | "cancelled";
    startTime: number;
    endTime?: number;
    progress: number; // 0-100
  };
  tasks: Record<string, WorkflowTask>;
  executionOrder: string[]; // Ordered list of task IDs
  currentStepIndex: number;
  results: Record<string, unknown>; // Final workflow results
  metadata: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    skippedTasks: number;
    executionLog: Array<{
      timestamp: number;
      taskId: string;
      event: string;
      details?: Record<string, unknown>;
    }>;
  };
  rollbackPlan?: {
    steps: Array<{
      taskId: string;
      rollbackAction: string;
      rollbackData?: Record<string, unknown>;
    }>;
  };
}

// Configuration for the workflow agent
interface WorkflowConfig {
  maxConcurrentTasks: number;
  taskTimeoutMs: number;
  enableRollback: boolean;
  maxGlobalRetries: number;
  saveIntermediateResults: boolean;
}

/**
 * Workflow Agent class demonstrating complex EA SDK integration
 */
export class WorkflowAgent {
  constructor(
    private readonly agentRuntime: AgentRuntimeServiceApi,
    private readonly config: WorkflowConfig
  ) {}

  /**
   * Create initial workflow state
   */
  createWorkflowState(
    workflowId: string,
    userId: string,
    workflowDefinition: {
      name: string;
      tasks: Omit<WorkflowTask, "status" | "retryCount">[];
    },
    orgId?: string
  ): WorkflowAgentState {
    const tasksRecord: Record<string, WorkflowTask> = {};
    const executionOrder: string[] = [];

    // Initialize tasks and determine execution order
    for (const taskDef of workflowDefinition.tasks) {
      tasksRecord[taskDef.id] = {
        ...taskDef,
        status: "pending",
        retryCount: 0,
      };
    }

    // Simple topological sort for execution order (dependencies first)
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (taskId: string): void => {
      if (temp.has(taskId)) {
        throw new Error(
          `Circular dependency detected involving task: ${taskId}`
        );
      }
      if (!visited.has(taskId)) {
        temp.add(taskId);
        const task = tasksRecord[taskId];
        if (!task) {
          throw new Error(`Task not found: ${taskId}`);
        }
        for (const depId of task.dependencies) {
          if (!tasksRecord[depId]) {
            throw new Error(`Dependency task not found: ${depId}`);
          }
          visit(depId);
        }
        temp.delete(taskId);
        visited.add(taskId);
        executionOrder.push(taskId);
      }
    };

    for (const taskId of Object.keys(tasksRecord)) {
      visit(taskId);
    }

    return {
      agentRuntime: this.agentRuntime,
      context: { workflowId, userId, orgId },
      workflow: {
        id: workflowId,
        name: workflowDefinition.name,
        status: "initializing",
        startTime: Date.now(),
        progress: 0,
      },
      tasks: tasksRecord,
      executionOrder,
      currentStepIndex: 0,
      results: {},
      metadata: {
        totalTasks: workflowDefinition.tasks.length,
        completedTasks: 0,
        failedTasks: 0,
        skippedTasks: 0,
        executionLog: [],
      },
    };
  }

  /**
   * State transformers for workflow operations
   */
  private readonly updateWorkflowStatus = createStateTransformer<
    WorkflowAgentState,
    WorkflowAgentState["workflow"]["status"]
  >((status, state) => ({
    ...state,
    workflow: {
      ...state.workflow,
      status,
      ...(status === "completed" ? { endTime: Date.now() } : {}),
    },
  }));

  private readonly updateTaskStatus = createStateTransformer<
    WorkflowAgentState,
    {
      taskId: string;
      status: TaskStatus;
      error?: string;
      output?: Record<string, unknown>;
    }
  >((update, state) => {
    const task = state.tasks[update.taskId];
    if (!task) return state;

    const updatedTask: WorkflowTask = {
      ...task,
      status: update.status,
      ...(update.error && { error: update.error }),
      ...(update.output && { output: update.output }),
      ...(update.status === "running" && { startTime: Date.now() }),
      ...(["completed", "failed", "cancelled"].includes(update.status) && {
        endTime: Date.now(),
      }),
    };

    return {
      ...state,
      tasks: { ...state.tasks, [update.taskId]: updatedTask },
      metadata: {
        ...state.metadata,
        ...(update.status === "completed" && {
          completedTasks: state.metadata.completedTasks + 1,
        }),
        ...(update.status === "failed" && {
          failedTasks: state.metadata.failedTasks + 1,
        }),
        ...(update.status === "skipped" && {
          skippedTasks: state.metadata.skippedTasks + 1,
        }),
      },
    };
  });

  private readonly logExecution = createStateTransformer<
    WorkflowAgentState,
    { taskId: string; event: string; details?: Record<string, unknown> }
  >((logEntry, state) => ({
    ...state,
    metadata: {
      ...state.metadata,
      executionLog: [
        ...state.metadata.executionLog,
        {
          timestamp: Date.now(),
          taskId: logEntry.taskId,
          event: logEntry.event,
          details: logEntry.details,
        },
      ],
    },
  }));

  /**
   * Initialize workflow execution
   */
  readonly initializeWorkflow = wrapLangGraphNode(
    "initialize-workflow",
    async (state: WorkflowAgentState): Promise<WorkflowAgentState> => {
      validateStateStructure(
        state,
        [
          "agentRuntime",
          "context.workflowId",
          "context.userId",
          "workflow",
          "tasks",
          "executionOrder",
        ],
        { nodeId: "initialize-workflow" }
      );

      let currentState = this.updateWorkflowStatus("running", state);

      // Create initialization activity
      const activity = createActivity(
        "workflow_initialized",
        {
          workflowId: getStateProperty(state, "context.workflowId", "unknown"),
          totalTasks: state.metadata.totalTasks,
          executionOrder: state.executionOrder,
        },
        {
          source: "workflow-agent",
          nodeId: "initialize-workflow",
        }
      );

      // Log initialization
      await runEffect(
        state.agentRuntime,
        Effect.logInfo("Workflow initialized", activity),
        { operation: "initialize_workflow", nodeId: "initialize-workflow" }
      );

      currentState = this.logExecution(
        {
          taskId: "system",
          event: "workflow_initialized",
          details: { totalTasks: state.metadata.totalTasks },
        },
        currentState
      );

      return currentState;
    }
  );

  /**
   * Execute next available task
   */
  readonly executeNextTask = wrapLangGraphNode(
    "execute-next-task",
    async (state: WorkflowAgentState): Promise<WorkflowAgentState> => {
      // Find next executable task
      const nextTask = this.findNextExecutableTask(state);
      if (!nextTask) {
        // No more tasks to execute
        return this.updateWorkflowStatus("completed", state);
      }

      let currentState = this.updateTaskStatus(
        {
          taskId: nextTask.id,
          status: "running",
        },
        state
      );

      currentState = this.logExecution(
        {
          taskId: nextTask.id,
          event: "task_started",
          details: {
            taskType: nextTask.type,
            dependencies: nextTask.dependencies,
          },
        },
        currentState
      );

      try {
        // Execute the task based on its type
        const taskResult = await this.executeTask(nextTask, currentState);

        currentState = this.updateTaskStatus(
          {
            taskId: nextTask.id,
            status: "completed",
            output: taskResult,
          },
          currentState
        );

        // Store results if configured
        if (this.config.saveIntermediateResults) {
          currentState = setStateProperty(
            currentState,
            `results.${nextTask.id}`,
            taskResult
          );
        }

        currentState = this.logExecution(
          {
            taskId: nextTask.id,
            event: "task_completed",
            details: { output: taskResult },
          },
          currentState
        );

        // Update progress
        const progress = Math.round(
          (currentState.metadata.completedTasks /
            currentState.metadata.totalTasks) *
            100
        );
        currentState = setStateProperty(
          currentState,
          "workflow.progress",
          progress
        );

        return currentState;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown task execution error";

        currentState = this.updateTaskStatus(
          {
            taskId: nextTask.id,
            status: "failed",
            error: errorMessage,
          },
          currentState
        );

        currentState = this.logExecution(
          {
            taskId: nextTask.id,
            event: "task_failed",
            details: { error: errorMessage, retryCount: nextTask.retryCount },
          },
          currentState
        );

        // Check if we should retry
        if (nextTask.retryCount < nextTask.maxRetries) {
          const updatedTask = {
            ...nextTask,
            retryCount: nextTask.retryCount + 1,
            status: "pending" as TaskStatus,
          };
          currentState = {
            ...currentState,
            tasks: { ...currentState.tasks, [nextTask.id]: updatedTask },
          };

          currentState = this.logExecution(
            {
              taskId: nextTask.id,
              event: "task_retry_scheduled",
              details: {
                retryCount: updatedTask.retryCount,
                maxRetries: updatedTask.maxRetries,
              },
            },
            currentState
          );
        } else {
          // Max retries exceeded, handle failure
          if (this.config.enableRollback) {
            return await this.handleTaskFailure(nextTask.id, currentState);
          }
            return this.updateWorkflowStatus("failed", currentState);
        }

        return currentState;
      }
    }
  );

  /**
   * Execute a specific task based on its type
   */
  private async executeTask(
    task: WorkflowTask,
    state: WorkflowAgentState
  ): Promise<Record<string, unknown>> {
    const context = {
      operation: `execute_${task.type}`,
      nodeId: "execute-task",
      agentId: getStateProperty(state, "agentRuntime.id", "unknown"),
    };

    switch (task.type) {
      case "file_operation":
        return await this.executeFileOperation(task, state, context);
      case "api_call":
        return await this.executeApiCall(task, state, context);
      case "data_processing":
        return await this.executeDataProcessing(task, state, context);
      case "validation":
        return await this.executeValidation(task, state, context);
      case "notification":
        return await this.executeNotification(task, state, context);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Execute file operation task
   */
  private async executeFileOperation(
    task: WorkflowTask,
    state: WorkflowAgentState,
    context: { operation: string; nodeId: string; agentId: string }
  ): Promise<Record<string, unknown>> {
    return await runEffect(
      state.agentRuntime,
      Effect.gen(function* () {
        // Mock file service implementation since getFileService is no longer available
        const operation = task.input?.operation as string;
        const filePath = task.input?.filePath as string;

        switch (operation) {
          case "read": {
            const fileId = task.input?.fileId as string;
            const mockContent = `Mock content for file ${fileId}`;
            return { content: mockContent, filePath, operation: "read" };
          }
          case "write": {
            const _data = task.input?.data as string;
            const _filename =
              (task.input?.filename as string) || "workflow-file.txt";
            const mockFileId = `mock-file-${Date.now()}`;
            return {
              filePath,
              operation: "write",
              success: true,
              fileId: mockFileId,
            };
          }
          case "exists": {
            const fileId = task.input?.fileId as string;
            // Mock that files exist if they have a valid ID
            const exists = fileId && fileId.length > 0;
            return { filePath, exists, operation: "exists" };
          }
          default:
            throw new Error(`Unknown file operation: ${operation}`);
        }
      }) as Effect.Effect<Record<string, unknown>, unknown, never>,
      context
    );
  }

  /**
   * Execute API call task
   */
  private async executeApiCall(
    task: WorkflowTask,
    state: WorkflowAgentState,
    context: { operation: string; nodeId: string; agentId: string }
  ): Promise<Record<string, unknown>> {
    return await runEffect(
      state.agentRuntime,
      Effect.succeed({
        url: task.input?.url as string,
        method: (task.input?.method as string) || "GET",
        statusCode: 200,
        response: { success: true, data: task.input?.payload },
        timestamp: Date.now(),
      }) as Effect.Effect<Record<string, unknown>, unknown, never>,
      context
    );
  }

  /**
   * Execute data processing task
   */
  private async executeDataProcessing(
    task: WorkflowTask,
    state: WorkflowAgentState,
    context: { operation: string; nodeId: string; agentId: string }
  ): Promise<Record<string, unknown>> {
    return await runEffect(
      state.agentRuntime,
      Effect.gen(function* () {
        const processingType = task.input?.type as string;
        const inputData = task.input?.data;

        switch (processingType) {
          case "transform": {
            // Simulate data transformation
            return {
              originalData: inputData,
              transformedData: JSON.stringify(inputData).toUpperCase(),
              processingType: "transform",
            };
          }
          case "aggregate": {
            // Simulate data aggregation
            const array = inputData as number[];
            return {
              originalData: inputData,
              sum: array.reduce((a, b) => a + b, 0),
              average: array.reduce((a, b) => a + b, 0) / array.length,
              processingType: "aggregate",
            };
          }
          default:
            throw new Error(`Unknown processing type: ${processingType}`);
        }
      }) as Effect.Effect<Record<string, unknown>, unknown, never>,
      context
    );
  }

  /**
   * Execute validation task
   */
  private async executeValidation(
    task: WorkflowTask,
    _state: WorkflowAgentState,
    _context: { operation: string; nodeId: string; agentId: string }
  ): Promise<Record<string, unknown>> {
    const validationType = task.input?.type as string;
    const dataToValidate = task.input?.data;

    // Simulate validation logic
    const isValid =
      validationType === "schema"
        ? typeof dataToValidate === "object" && dataToValidate !== null
        : dataToValidate !== null && dataToValidate !== undefined;

    if (!isValid) {
      throw new Error(`Validation failed: ${validationType}`);
    }

    return {
      validationType,
      data: dataToValidate,
      isValid: true,
      validatedAt: Date.now(),
    };
  }

  /**
   * Execute notification task
   */
  private async executeNotification(
    task: WorkflowTask,
    state: WorkflowAgentState,
    context: { operation: string; nodeId: string; agentId: string }
  ): Promise<Record<string, unknown>> {
    return await runEffect(
      state.agentRuntime,
      Effect.succeed({
        recipient: task.input?.recipient as string,
        channel: (task.input?.channel as string) || "email",
        message: task.input?.message as string,
        sentAt: Date.now(),
        success: true,
      }) as Effect.Effect<Record<string, unknown>, unknown, never>,
      context
    );
  }

  /**
   * Find next executable task (dependencies satisfied)
   */
  private findNextExecutableTask(
    state: WorkflowAgentState
  ): WorkflowTask | null {
    for (const taskId of state.executionOrder) {
      const task = state.tasks[taskId];
      if (task && task.status === "pending") {
        // Check if all dependencies are completed
        const dependenciesCompleted = task.dependencies.every((depId) => {
          const depTask = state.tasks[depId];
          return depTask && depTask.status === "completed";
        });

        if (dependenciesCompleted) {
          return task;
        }
      }
    }
    return null;
  }

  /**
   * Handle task failure with rollback if enabled
   */
  private async handleTaskFailure(
    _taskId: string,
    state: WorkflowAgentState
  ): Promise<WorkflowAgentState> {
    // Implementation would rollback completed tasks
    // For simplicity, just mark workflow as failed
    return this.updateWorkflowStatus("failed", state);
  }

  /**
   * Get workflow summary
   */
  getWorkflowSummary(state: WorkflowAgentState): {
    workflowId: string;
    status: string;
    progress: number;
    duration: number;
    tasksCompleted: number;
    tasksFailed: number;
    totalTasks: number;
  } {
    const duration =
      (state.workflow.endTime || Date.now()) - state.workflow.startTime;

    return {
      workflowId: state.workflow.id,
      status: state.workflow.status,
      progress: state.workflow.progress,
      duration,
      tasksCompleted: state.metadata.completedTasks,
      tasksFailed: state.metadata.failedTasks,
      totalTasks: state.metadata.totalTasks,
    };
  }
}

/**
 * Factory function to create a configured workflow agent
 */
export function createWorkflowAgent(
  agentRuntime: AgentRuntimeServiceApi,
  config: Partial<WorkflowConfig> = {}
): WorkflowAgent {
  const defaultConfig: WorkflowConfig = {
    maxConcurrentTasks: 3,
    taskTimeoutMs: 30000,
    enableRollback: true,
    maxGlobalRetries: 2,
    saveIntermediateResults: true,
  };

  return new WorkflowAgent(agentRuntime, { ...defaultConfig, ...config });
}

/**
 * Example workflow definition
 */
export const exampleWorkflowDefinition = {
  name: "Data Processing Pipeline",
  tasks: [
    {
      id: "fetch_data",
      name: "Fetch Input Data",
      type: "api_call" as TaskType,
      dependencies: [],
      input: { url: "https://api.example.com/data", method: "GET" },
      maxRetries: 2,
    },
    {
      id: "validate_data",
      name: "Validate Input Data",
      type: "validation" as TaskType,
      dependencies: ["fetch_data"],
      input: { type: "schema", data: null }, // Will be populated from fetch_data output
      maxRetries: 1,
    },
    {
      id: "process_data",
      name: "Process Data",
      type: "data_processing" as TaskType,
      dependencies: ["validate_data"],
      input: { type: "transform", data: null }, // Will be populated from validate_data output
      maxRetries: 2,
    },
    {
      id: "save_results",
      name: "Save Results",
      type: "file_operation" as TaskType,
      dependencies: ["process_data"],
      input: { operation: "write", filePath: "/tmp/results.json", data: null },
      maxRetries: 3,
    },
    {
      id: "notify_completion",
      name: "Send Completion Notification",
      type: "notification" as TaskType,
      dependencies: ["save_results"],
      input: {
        recipient: "admin@example.com",
        channel: "email",
        message: "Data processing workflow completed successfully",
      },
      maxRetries: 1,
    },
  ],
};
