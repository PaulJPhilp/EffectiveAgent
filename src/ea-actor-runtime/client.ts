/**
 * @file A simple WebSocket client to test the ActorServer.
 */

import { wsParse, wsStringify } from "@/utils/ws-utils.js"
import WebSocket from "ws"

// Give the server a moment to start
setTimeout(() => {
    const ws = new WebSocket("ws://localhost:8081")

    ws.on("open", () => {
        console.log("Connected to ActorServer.")

        // 1. Create a new chat-agent
        const createMessage = {
            type: "SYSTEM",
            payload: {
                command: "create",
                agentType: "chat-agent"
            }
        }
        console.log("Sending CREATE message:", createMessage)
        ws.send(wsStringify(createMessage))
    })

    ws.on("message", async (data: WebSocket.Data) => {
        const message = await wsParse(data.toString())
        console.log("Received from server:", message)

        // 2. Once the agent is created, send a chat message
        if (message.type === "SYSTEM" && message.payload.status === "created") {
            const actorId = message.payload.actorId

            const chatMessage = {
                type: "USER_MESSAGE",
                agentRuntimeId: actorId,
                payload: {
                    content: "Hello, world!"
                },
                sequence: 1,
                timestamp: Date.now(),
                metadata: {}
            }
            console.log("Sending CHAT message:", chatMessage)
            ws.send(wsStringify(chatMessage))

            // 3. Close the connection after a delay
            setTimeout(() => {
                console.log("Closing connection.")
                ws.close()
            }, 2000)
        }
    })

    ws.on("close", () => {
        console.log("Disconnected from ActorServer.")
    })

    ws.on("error", error => {
        console.error("WebSocket error:", error)
    })
}, 1000) 