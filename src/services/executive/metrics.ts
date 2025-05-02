import { Effect, Metric, MetricKeyType, MetricState, Duration } from "effect";

/**
 * Metrics for the ExecutiveService
 */
export const ExecutiveMetrics = {
  /**
   * Current token usage gauge
   */
  currentTokenUsage: Metric.gauge("executive_current_token_usage"),

  /**
   * Total tokens used counter
   */
  totalTokensUsed: Metric.counter("executive_total_tokens_used"),

  /**
   * Tokens used by model counter
   */
  modelTokensUsed: (modelId: string) => 
    Metric.counter(`executive_model_tokens_used.${modelId}`),

  /**
   * Tracks the duration of effect executions
   */
  executionDuration: Metric.timerWithBoundaries(
    "executive_execution_duration_ms",
    [
      10,    // 10ms
      50,    // 50ms
      100,   // 100ms
      500,   // 500ms
      1000,  // 1s
      5000,  // 5s
      10000  // 10s
    ]
  ),

  /**
   * Counts total executions
   */
  totalExecutions: Metric.counter("executive_total_executions"),

  /**
   * Counts failed executions
   */
  failedExecutions: Metric.counter("executive_failed_executions")
} as const;

/**
 * Helper to track execution durations
 */
export const trackExecutionDuration = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => 
  Metric.trackDuration(effect, ExecutiveMetrics.executionDuration);

/**
 * Helper to track token usage
 */
export const trackTokenUsage = (
  modelId: string,
  tokenCount: number
): Effect.Effect<void> => Effect.gen(function* () {
  // Update current token usage gauge
  yield* Metric.update(
    ExecutiveMetrics.currentTokenUsage,
    tokenCount
  );

  // Increment total tokens counter
  yield* Metric.update(
    ExecutiveMetrics.totalTokensUsed,
    tokenCount
  );

  // Increment model-specific counter
  yield* Metric.update(
    ExecutiveMetrics.modelTokensUsed(modelId),
    tokenCount
  );
});
