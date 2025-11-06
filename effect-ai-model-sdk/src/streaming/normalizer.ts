import type { UnifiedStreamEvent } from "./types.js";

/**
 * Normalize provider-specific streaming events to unified events
 */
export class StreamNormalizer {
  private textBuffer = "";
  private toolCallBuffers = new Map<string, { name: string; args: Record<string, any> }>();

  /**
   * Normalize a Vercel AI SDK stream chunk to unified events
   */
  normalizeVercelChunk(chunk: any, provider: "openai" | "anthropic"): UnifiedStreamEvent[] {
    const events: UnifiedStreamEvent[] = [];
    const timestamp = Date.now();

    switch (chunk.type) {
      case "text-delta":
        this.textBuffer += chunk.textDelta;
        events.push({
          type: "token-delta",
          delta: chunk.textDelta,
          timestamp,
          provider,
        });
        break;

      case "tool-call-delta":
        const toolCallId = chunk.toolCallId || "unknown";
        if (!this.toolCallBuffers.has(toolCallId)) {
          this.toolCallBuffers.set(toolCallId, { name: "", args: {} });
        }
        const buffer = this.toolCallBuffers.get(toolCallId)!;

        if (chunk.toolName) {
          buffer.name = chunk.toolName;
          events.push({
            type: "tool-call-started",
            toolName: buffer.name,
            argsPartial: buffer.args,
            timestamp,
            provider,
          });
        }

        if (chunk.argsTextDelta) {
          // Parse incremental JSON
          try {
            const currentArgsStr = JSON.stringify(buffer.args) + chunk.argsTextDelta;
            const parsed = JSON.parse(currentArgsStr);
            const delta = { ...parsed };

            // Calculate what's new
            const previousArgs = { ...buffer.args };
            buffer.args = parsed;

            events.push({
              type: "tool-call-delta",
              toolName: buffer.name,
              argsDelta: delta,
              timestamp,
              provider,
            });
          } catch {
            // JSON parsing failed, wait for more deltas
          }
        }
        break;

      case "tool-call":
        const callId = chunk.toolCallId || "unknown";
        const finalBuffer = this.toolCallBuffers.get(callId);
        if (finalBuffer) {
          events.push({
            type: "tool-call-ready",
            toolName: finalBuffer.name,
            argsFinal: finalBuffer.args,
            timestamp,
            provider,
          });
        }
        break;

      case "finish":
        events.push({
          type: "final-message",
          text: this.textBuffer,
          raw: chunk,
          timestamp,
          provider,
        });

        events.push({
          type: "complete",
          timestamp,
          provider,
        });
        break;

      case "error":
        events.push({
          type: "error",
          error: new Error(chunk.error || "Stream error"),
          timestamp,
          provider,
        });
        break;
    }

    return events;
  }

  /**
   * Get the current accumulated text
   */
  getText(): string {
    return this.textBuffer;
  }

  /**
   * Reset the normalizer state
   */
  reset(): void {
    this.textBuffer = "";
    this.toolCallBuffers.clear();
  }
}
