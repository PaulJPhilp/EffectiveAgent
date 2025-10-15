/**
 * @file Main entry point for the EA Actor Runtime server.
 * This script starts a WebSocket server on top of the ea-agent-runtime.
 */

import { WebSocketServer } from "ws";
import { getAgentRuntime } from "@/ea-agent-runtime/production-runtime.js";

// Simple WebSocket server without Effect dependencies
async function startActorServer() {
  try {
    // Initialize the AgentRuntime first
    const _agentRuntime = await getAgentRuntime();
    console.log("✅ AgentRuntime initialized successfully");

    // Start WebSocket server
    const wsPort = Number(process.env.WS_PORT) || 8081;
    const wss = new WebSocketServer({ port: wsPort });

    wss.on("connection", (ws) => {
      console.log("🔌 New WebSocket connection");

      ws.on("message", (message) => {
        console.log("📨 Received message:", message.toString());
        // Echo back for now
        ws.send(`Echo: ${message}`);
      });

      ws.on("close", () => {
        console.log("🔌 WebSocket connection closed");
      });
    });

    console.log(
      `🚀 Actor Runtime WebSocket server listening on port ${wsPort}`
    );
    console.log(
      "Application running. ActorServer is waiting for connections..."
    );
  } catch (error) {
    console.error("Application failed to start:", error);
    process.exit(1);
  }
}

startActorServer();
