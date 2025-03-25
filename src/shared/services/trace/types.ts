/**
 * Metrics from an LLM call
 */
export interface TokenMetrics {
	promptTokens: number
	completionTokens: number
	totalTokens: number
	estimatedCost: number
}

/**
 * Status of a trace
 */
export type TraceStatus = "started" | "completed" | "error"

/**
 * A single trace of an LLM interaction
 */
export interface Trace {
	traceId: string
	runId: string
	agentId: string
	taskName: string
	provider: string
	modelName: string
	startTime: Date
	endTime?: Date
	duration?: number
	prompt: string
	response?: string
	error?: string
	status: TraceStatus
	metrics: TokenMetrics
}

/**
 * Interface for trace service
 */
export interface ITraceService {
	startTrace(params: {
		runId: string
		agentId: string
		taskName: string
		provider: string
		modelName: string
		prompt: string
	}): Promise<string> // Returns traceId

	completeTrace(params: {
		traceId: string
		response: string
		metrics: TokenMetrics
	}): Promise<void>

	errorTrace(params: {
		traceId: string
		error: string
		metrics?: TokenMetrics
	}): Promise<void>

	getTrace(traceId: string): Promise<Trace>
	getTracesByRun(runId: string): Promise<Trace[]>
	getTracesByAgent(agentId: string): Promise<Trace[]>
	exportTraces(format: "json" | "csv"): Promise<string>
} 