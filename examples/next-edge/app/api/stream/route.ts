/**
 * Next.js Edge Runtime API route for streaming text
 */

import { createProvider } from "@effective-agent/ai-sdk";
import { streamText } from "@effective-agent/ai-sdk";
import { NextRequest } from "next/server";

// Force Edge Runtime
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { messages, temperature = 0.7 } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize provider (requires OPENAI_API_KEY environment variable)
    const provider = createProvider("openai");
    const model = provider.languageModel("gpt-4o-mini");

    const streamHandle = streamText(model, {
      model: "gpt-4o-mini",
      temperature,
      messages,
    });

    // Convert our unified stream events to Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = streamHandle.readable.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            let eventData: string;

            switch (value.type) {
              case "token-delta":
                eventData = `data: ${JSON.stringify({ type: "token", delta: value.delta })}\n\n`;
                break;
              case "final-message":
                eventData = `data: ${JSON.stringify({ type: "final", text: value.text })}\n\n`;
                break;
              case "complete":
                eventData = `data: ${JSON.stringify({ type: "complete" })}\n\n`;
                break;
              case "error":
                eventData = `data: ${JSON.stringify({ type: "error", error: value.error.message })}\n\n`;
                break;
              default:
                continue;
            }

            controller.enqueue(encoder.encode(eventData));
          }
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(error) })}\n\n`));
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
