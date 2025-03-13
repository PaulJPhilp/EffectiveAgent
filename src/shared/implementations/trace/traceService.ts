import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import type { ITraceService, TokenMetrics, Trace } from "../../interfaces/trace.js"

export class TraceService implements ITraceService {
    private traces: Map<string, Trace>
    private outputDir: string

    constructor(outputDir: string = path.join(process.cwd(), "data", "traces")) {
        this.traces = new Map()
        this.outputDir = outputDir
    }

    public async startTrace(params: {
        runId: string
        agentId: string
        taskName: string
        provider: string
        modelName: string
        prompt: string
    }): Promise<string> {
        const traceId = crypto.randomUUID()
        const startTime = new Date()

        const trace: Trace = {
            traceId,
            startTime,
            status: "started",
            metrics: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                estimatedCost: 0
            },
            ...params
        }

        this.traces.set(traceId, trace)
        await this.saveTrace(trace)

        return traceId
    }

    public async completeTrace(params: {
        traceId: string
        response: string
        metrics: TokenMetrics
    }): Promise<void> {
        const trace = this.traces.get(params.traceId)
        if (!trace) {
            throw new Error(`Trace not found: ${params.traceId}`)
        }

        const endTime = new Date()
        const duration = endTime.getTime() - trace.startTime.getTime()

        const updatedTrace: Trace = {
            ...trace,
            response: params.response,
            metrics: params.metrics,
            endTime,
            duration,
            status: "completed"
        }

        this.traces.set(params.traceId, updatedTrace)
        await this.saveTrace(updatedTrace)
    }

    public async errorTrace(params: {
        traceId: string
        error: string
        metrics?: TokenMetrics
    }): Promise<void> {
        const trace = this.traces.get(params.traceId)
        if (!trace) {
            throw new Error(`Trace not found: ${params.traceId}`)
        }

        const endTime = new Date()
        const duration = endTime.getTime() - trace.startTime.getTime()

        const updatedTrace: Trace = {
            ...trace,
            error: params.error,
            metrics: params.metrics ?? trace.metrics,
            endTime,
            duration,
            status: "error"
        }

        this.traces.set(params.traceId, updatedTrace)
        await this.saveTrace(updatedTrace)
    }

    public async getTrace(traceId: string): Promise<Trace> {
        const trace = this.traces.get(traceId)
        if (!trace) {
            throw new Error(`Trace not found: ${traceId}`)
        }
        return trace
    }

    public async getTracesByRun(runId: string): Promise<Trace[]> {
        return Array.from(this.traces.values()).filter(trace => trace.runId === runId)
    }

    public async getTracesByAgent(agentId: string): Promise<Trace[]> {
        return Array.from(this.traces.values()).filter(trace => trace.agentId === agentId)
    }

    public async exportTraces(format: "json" | "csv"): Promise<string> {
        const traces = Array.from(this.traces.values())

        if (format === "json") {
            return JSON.stringify(traces, null, 2)
        }

        // CSV format
        const headers = [
            "traceId",
            "runId",
            "agentId",
            "taskName",
            "provider",
            "modelName",
            "startTime",
            "endTime",
            "duration",
            "status",
            "promptTokens",
            "completionTokens",
            "totalTokens",
            "estimatedCost"
        ]

        const rows = traces.map(trace => [
            trace.traceId,
            trace.runId,
            trace.agentId,
            trace.taskName,
            trace.provider,
            trace.modelName,
            trace.startTime.toISOString(),
            trace.endTime?.toISOString() ?? "",
            trace.duration?.toString() ?? "",
            trace.status,
            trace.metrics.promptTokens.toString(),
            trace.metrics.completionTokens.toString(),
            trace.metrics.totalTokens.toString(),
            trace.metrics.estimatedCost.toString()
        ])

        return [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n")
    }

    private async saveTrace(trace: Trace): Promise<void> {
        // Create run directory if it doesn't exist
        const runDir = path.join(this.outputDir, trace.runId)
        await fs.mkdir(runDir, { recursive: true })

        // Save trace to file
        const filePath = path.join(runDir, `${trace.traceId}.json`)
        await fs.writeFile(filePath, JSON.stringify(trace, null, 2))
    }
} 