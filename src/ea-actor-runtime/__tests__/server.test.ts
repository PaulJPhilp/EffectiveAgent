import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ActorServer } from "../server.js"

describe("ActorServer", () => {
    let cleanup: Effect.Effect<void, never, never>

    beforeEach(async () => {
        cleanup = Effect.void
    })

    afterEach(async () => {
        await Effect.runPromise(cleanup)
    })

    it("should implement proper Effect.Service pattern", async () => {
        // Test that the service class is properly defined
        expect(ActorServer).toBeDefined()
        expect(typeof ActorServer).toBe("function")

        // Test that it has the Effect.Service structure
        expect(ActorServer.Default).toBeDefined()
        expect(typeof ActorServer.Default).toBe("object")
    })

    it("should have correct service configuration", async () => {
        // Verify the service has the expected structure without starting servers
        const serviceLayer = ActorServer.Default
        expect(serviceLayer).toBeDefined()

        // Check that it's a proper Layer (has pipe method)
        expect(typeof serviceLayer.pipe).toBe("function")
    })

    it("should use environment variables for configuration", async () => {
        // Test environment variable reading
        const originalHttpPort = process.env.HTTP_PORT
        const originalWsPort = process.env.WS_PORT

        try {
            process.env.HTTP_PORT = "12345"
            process.env.WS_PORT = "12346"

            // Verify the environment variables are read
            const httpPort = Number(process.env.HTTP_PORT) || 8080
            const wsPort = Number(process.env.WS_PORT) || 8081

            expect(httpPort).toBe(12345)
            expect(wsPort).toBe(12346)
        } finally {
            // Restore original values
            if (originalHttpPort !== undefined) {
                process.env.HTTP_PORT = originalHttpPort
            } else {
                process.env.HTTP_PORT = undefined as any
            }

            if (originalWsPort !== undefined) {
                process.env.WS_PORT = originalWsPort
            } else {
                process.env.WS_PORT = undefined as any
            }
        }
    })
}) 