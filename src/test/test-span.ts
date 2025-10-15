import { Context, Option } from "effect";
import type { Span, SpanKind, SpanLink, SpanStatus } from "effect/Tracer";

const _SpanStatusValues = {
  Ok: "ok",
  Error: "error",
  Unset: "unset"
} as const;

/**
 * A pre-defined test implementation of Span for use in tests.
 * 
 * This provides a minimal, deterministic Span implementation that can be used
 * in test scenarios where a Span is required but tracing details are not the focus.
 * 
 * All spans created by this class will:
 * - Have a predictable spanId and traceId based on the provided name
 * - Start with "unset" status
 * - Have no parent span
 * - Use internal kind
 * - Support basic attribute and event recording
 */
export class TestSpan implements Span {
  readonly _tag = "Span";
  readonly spanId: string;
  readonly traceId: string;
  readonly sampled = true;
  readonly parent = Option.none<Span>();
  readonly context = Context.empty();
  readonly status = "unset" as unknown as SpanStatus;
  readonly startTime = BigInt(1);  // Use fixed timestamp for determinism
  endTime: bigint | null = null;  // Will be set to BigInt(2) when end() is called
  readonly attributes: ReadonlyMap<string, unknown> = new Map();
  readonly events: Array<{ name: string; startTime: bigint; attributes: Record<string, unknown> }> = [];
  readonly links: ReadonlyArray<SpanLink> = [];
  readonly kind: SpanKind = "internal";

  constructor(readonly name: string) {
    this.spanId = `test-span-${name}`;
    this.traceId = `test-trace-${name}`;
  }

  end(): void {
    this.endTime = BigInt(2);  // Use fixed timestamp for determinism
  }

  attribute(key: string, value: unknown): void {
    (this.attributes as Map<string, unknown>).set(key, value);
  }

  event(name: string, startTime: bigint, attributes?: Record<string, unknown>): void {
    this.events.push({
      name,
      startTime,
      attributes: attributes ?? {}
    });
  }

  addLinks(links: ReadonlyArray<SpanLink>): void {
    (this.links as SpanLink[]).push(...links);
  }
}
