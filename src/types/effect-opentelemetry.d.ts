declare module "@effect/opentelemetry" {
    export interface Span {
        readonly _tag: "Span"
        readonly traceId: string
        readonly spanId: string
        readonly parentSpanId?: string
        readonly name: string
        readonly kind: number
        readonly startTime: bigint
        readonly endTime?: bigint
        readonly attributes: Record<string, unknown>
        readonly status: {
            code: number
            message?: string
        }
        readonly events: Array<{
            name: string
            timestamp: bigint
            attributes?: Record<string, unknown>
        }>
        readonly links: Array<{
            traceId: string
            spanId: string
            attributes?: Record<string, unknown>
        }>
    }
} 