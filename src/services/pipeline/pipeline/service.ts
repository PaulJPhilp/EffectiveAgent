import { AgentActivity, AgentActivityType, AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { Effect, Option, Ref } from "effect";
import {
  ExecutiveParameters,
  ExecutiveService,
  ExecutiveServiceError,
} from "../executive-service/index.js";
import { PipelineServiceInterface } from "./api.js";

/**
 * Pipeline execution agent state
 */
export interface PipelineAgentState {
  readonly executionCount: number
  readonly lastExecution: Option.Option<{
    readonly timestamp: number
    readonly parameters?: ExecutiveParameters
    readonly success: boolean
  }>
  readonly lastUpdate: Option.Option<number>
  readonly executionHistory: ReadonlyArray<{
    readonly timestamp: number
    readonly success: boolean
    readonly parameters?: ExecutiveParameters
    readonly durationMs?: number
  }>
}

/**
 * Pipeline execution commands
 */
interface ExecutePipelineCommand {
  readonly type: "EXECUTE_PIPELINE"
  readonly parameters?: ExecutiveParameters
}

interface StateUpdateCommand {
  readonly type: "UPDATE_STATE"
  readonly execution: {
    readonly timestamp: number
    readonly parameters?: ExecutiveParameters
    readonly success: boolean
    readonly durationMs?: number
  }
}

type PipelineActivityPayload = ExecutePipelineCommand | StateUpdateCommand

/**
 * Implementation of the Pipeline Service using Effect.Service pattern with AgentRuntime
 * Gets singleton ExecutiveService from AgentRuntime through dependency injection.
 */
export class PipelineService
  extends Effect.Service<PipelineServiceInterface>()("PipelineService", {
    effect: Effect.gen(function* () {
      // Get singleton services from AgentRuntime through dependency injection
      const agentRuntimeService = yield* AgentRuntimeService;
      const executiveService = yield* ExecutiveService;

      const agentId = makeAgentRuntimeId("pipeline-service-agent");

      const initialState: PipelineAgentState = {
        executionCount: 0,
        lastExecution: Option.none(),
        lastUpdate: Option.none(),
        executionHistory: []
      };

      // Create internal state management
      const internalStateRef = yield* Ref.make<PipelineAgentState>(initialState);

      // Create the agent runtime (for testing/debugging)
      const runtime = yield* agentRuntimeService.create(agentId, initialState);

      yield* Effect.log("PipelineService agent initialized with singleton services");

      // Helper function to update internal state
      const updateState = (execution: {
        readonly timestamp: number
        readonly parameters?: ExecutiveParameters
        readonly success: boolean
        readonly durationMs?: number
      }) => Effect.gen(function* () {
        const currentState = yield* Ref.get(internalStateRef);

        const updatedHistory = [
          ...currentState.executionHistory,
          execution
        ].slice(-20); // Keep last 20 executions

        const newState: PipelineAgentState = {
          executionCount: currentState.executionCount + 1,
          lastExecution: Option.some({
            timestamp: execution.timestamp,
            parameters: execution.parameters,
            success: execution.success
          }),
          lastUpdate: Option.some(Date.now()),
          executionHistory: updatedHistory
        };

        yield* Ref.set(internalStateRef, newState);

        // Send state update activity to AgentRuntime
        const stateUpdateActivity: AgentActivity = {
          id: `pipeline-update-${Date.now()}`,
          agentRuntimeId: agentId,
          timestamp: Date.now(),
          type: AgentActivityType.STATE_CHANGE,
          payload: {
            type: "UPDATE_STATE",
            execution
          } as StateUpdateCommand,
          metadata: {},
          sequence: 0
        };
        yield* agentRuntimeService.send(agentId, stateUpdateActivity);

        yield* Effect.log("Updated pipeline state", {
          oldCount: currentState.executionCount,
          newCount: newState.executionCount
        });
      });

      const service: PipelineServiceInterface = {
        _tag: "PipelineService" as const,
        execute: <A, E, R>(
          effectToRun: Effect.Effect<A, E, R>,
          parameters?: ExecutiveParameters,
        ): Effect.Effect<A, E | ExecutiveServiceError, R> =>
          Effect.gen(function* () {
            const startTime = Date.now();

            // Log execution start
            yield* Effect.log("Starting pipeline execution", {
              hasParameters: !!parameters,
              maxRetries: parameters?.maxRetries,
              timeoutMs: parameters?.timeoutMs
            });

            // Execute using the singleton ExecutiveService (no need to send COMMAND activity)
            const result = yield* executiveService.execute(effectToRun, parameters).pipe(
              Effect.tap((result) => Effect.gen(function* () {
                yield* Effect.log("Pipeline execution completed successfully");

                const endTime = Date.now();
                const durationMs = endTime - startTime;

                // Update agent state with successful execution results
                yield* updateState({
                  timestamp: startTime,
                  parameters,
                  success: true,
                  durationMs
                });

                return result;
              })),
              Effect.catchAll((error: E | ExecutiveServiceError) => Effect.gen(function* () {
                yield* Effect.logError("Pipeline execution failed", { error });

                const endTime = Date.now();
                const durationMs = endTime - startTime;

                // Update agent state with failed execution
                yield* updateState({
                  timestamp: startTime,
                  parameters,
                  success: false,
                  durationMs
                });

                return yield* Effect.fail(error);
              }))
            );

            return result;
          }).pipe(
            Effect.withSpan("PipelineService.execute")
          ),

        /**
         * Get the current agent state for monitoring/debugging
         */
        getAgentState: () => Ref.get(internalStateRef),

        /**
         * Get the agent runtime for advanced operations
         */
        getRuntime: () => ({
          id: agentId,
          getState: () => agentRuntimeService.getState<PipelineAgentState>(agentId),
          send: (activity: AgentActivity) => agentRuntimeService.send(agentId, activity),
          subscribe: () => agentRuntimeService.subscribe(agentId)
        }),

        /**
         * Terminate the pipeline service agent
         */
        terminate: () => agentRuntimeService.terminate(agentId)
      };

      return service;
    }),
    dependencies: [AgentRuntimeService.Default, ExecutiveService.Default],
  }) { }
