import { Effect, Layer, ReadonlyArray } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Import Effect Vitest integration
import * as EffectVitest from "@effect/vitest";
import { z } from "zod";

// Import service definition and errors
import {
    ClientConfigurationError,
    ClientInitializationError,
    ClientNotFoundError,
    ClientRegistrationError,
    MCPClientService,
    type MCPClient,
    type MCPClientExecutionContext
} from "../src/mcp-client/mcp-client-service.ts"; // Adjust path

// Import Live implementation and Layer
import { MCPClientServiceLiveLayer } from "../src/mcp-client/mcp-client-service-live.ts"; // Adjust path

// Import Mocks
import {
    getMockServices,
    MockConfigurationServiceLayer,
    mockLogger,
    MockLoggingServiceLayer, // Keep this helper to easily access mocks
    type MockConfigurationService
} from "./testing/mocks.ts"; // Adjust path

// --- Test Setup ---

// Example Client Definitions (same as before)
const mockClient1ConfigSchema = z.object({ apiKey: z.string().min(1) });
const mockClient1InitFn = vi.fn(
    (config: z.infer<typeof mockClient1ConfigSchema>, ctx: MCPClientExecutionContext) =>
        Effect.succeed({
            id: "client1-instance",
            configUsed: config,
            ctxReceived: !!ctx,
        })
);
const mockClient1: MCPClient<"client1", typeof mockClient1ConfigSchema, unknown> = {
    id: "client1",
    name: "Mock Client 1",
    description: "First mock client",
    tags: ["mock", "test"],
    configSchema: mockClient1ConfigSchema,
    initialize: mockClient1InitFn,
};

const mockClient2ConfigSchema = z.object({ token: z.string(), timeout: z.number().optional() });
const mockClient2InitFn = vi.fn(
    (config: z.infer<typeof mockClient2ConfigSchema>, ctx: MCPClientExecutionContext) =>
        Effect.succeed({
            id: "client2-instance",
            tokenShort: config.token.substring(0, 3),
            ctxReceived: !!ctx,
        })
);
const mockClient2: MCPClient<"client2", typeof mockClient2ConfigSchema, unknown> = {
    id: "client2",
    name: "Mock Client 2",
    description: "Second mock client",
    tags: ["test", "auth"],
    configSchema: mockClient2ConfigSchema,
    initialize: mockClient2InitFn,
};

const mockClientInitFailsSchema = z.object({ url: z.string().url() });
const mockClientInitFailsFn = vi.fn(
    (_config: z.infer<typeof mockClientInitFailsSchema>, _ctx: MCPClientExecutionContext) =>
        Effect.fail(new Error("Initialization network failure")) // Simulate init failure
);
const mockClientInitFails: MCPClient<"initFails", typeof mockClientInitFailsSchema, unknown> = {
    id: "initFails",
    name: "Mock Client Init Fails",
    description: "Client designed to fail initialization",
    tags: ["fail"],
    configSchema: mockClientInitFailsSchema,
    initialize: mockClientInitFailsFn,
};


// Create the full layer stack for testing
const TestLayer = MCPClientServiceLiveLayer.pipe(
    Layer.provide(MockLoggingServiceLayer),
    Layer.provide(MockConfigurationServiceLayer)
);

// Use EffectVitest.provide to make the layer available to all tests in the suite
const { it } = EffectVitest.provide(TestLayer);

// Helper to get service instance and mocks within tests
const getTestServiceAndMocks = Effect.all({
    svc: MCPClientService,
    mocks: getMockServices,
});

describe("MCPClientServiceLive", () => {
    // No need for manual runTest function anymore

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        // Clear config requires accessing the mock service instance.
        // This can be done within each test using Effect.gen or beforeAll/beforeEach
        // if the layer scope allows instance reuse (depends on Layer caching).
        // Let's clear it within tests needing specific config states for clarity.
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- registerClient ---
    describe("registerClient", () => {
        it("should register a new client successfully", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                yield* _(svc.registerClient(mockClient1));

                // Assertions on mocks can be done directly
                expect(mockLogger.info).toHaveBeenCalledWith(
                    "Client registered successfully",
                    { clientId: "client1" }
                );
                // Check internal state if needed (requires exposing it or testing via listClients)
                const clients = yield* _(svc.listClients());
                expect(clients.length).toBe(1);
                expect(clients[0].id).toBe("client1");
            }));

        it("should fail with ClientRegistrationError if client ID already exists", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                yield* _(svc.registerClient(mockClient1)); // First registration

                // Attempt second registration and catch the specific error
                const result = yield* _(
                    svc.registerClient({ ...mockClient1 }),
                    Effect.flip // Flip success/error channels
                );

                expect(result).toBeInstanceOf(ClientRegistrationError);
                expect(result.clientId).toBe("client1");
                expect(result.message).toContain("already registered");
                expect(mockLogger.error).toHaveBeenCalledWith(
                    "Client registration failed",
                    expect.objectContaining({
                        error: expect.any(ClientRegistrationError),
                    })
                );
            }));
    });

    // --- listClients ---
    describe("listClients", () => {
        it("should return an empty array when no clients are registered", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                const clients = yield* _(svc.listClients());
                expect(ReadonlyArray.isReadonlyArray(clients)).toBe(true);
                expect(clients.length).toBe(0);
            }));

        it("should return all registered clients when no tags are specified", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                yield* _(svc.registerClient(mockClient1));
                yield* _(svc.registerClient(mockClient2));
                const clients = yield* _(svc.listClients());

                expect(clients.length).toBe(2);
                expect(clients.map((c) => c.id)).toEqual(
                    expect.arrayContaining(["client1", "client2"])
                );
            }));

        it("should return only clients matching the specified tags", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                yield* _(svc.registerClient(mockClient1)); // tags: ["mock", "test"]
                yield* _(svc.registerClient(mockClient2)); // tags: ["test", "auth"]
                yield* _(svc.registerClient(mockClientInitFails)); // tags: ["fail"]

                const clients = yield* _(svc.listClients({ tags: ["auth"] }));

                expect(clients.length).toBe(1);
                expect(clients[0].id).toBe("client2");
            }));

        it("should return clients matching any of the specified tags", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                yield* _(svc.registerClient(mockClient1)); // tags: ["mock", "test"]
                yield* _(svc.registerClient(mockClient2)); // tags: ["test", "auth"]
                yield* _(svc.registerClient(mockClientInitFails)); // tags: ["fail"]

                const clients = yield* _(svc.listClients({ tags: ["mock", "fail"] }));

                expect(clients.length).toBe(2);
                expect(clients.map((c) => c.id)).toEqual(
                    expect.arrayContaining(["client1", "initFails"])
                );
            }));

        it("should return an empty array if no clients match the specified tags", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);
                yield* _(svc.registerClient(mockClient1));
                yield* _(svc.registerClient(mockClient2));

                const clients = yield* _(svc.listClients({ tags: ["nonexistent"] }));

                expect(clients.length).toBe(0);
            }));
    });

    // --- getClient ---
    describe("getClient", () => {
        it("should successfully retrieve and initialize a client", () =>
            Effect.gen(function* (_) {
                const { svc, mocks } = yield* _(getTestServiceAndMocks);
                const mockConfigSvc = mocks.configSvc as MockConfigurationService;

                const client1Config = { apiKey: "test-key-123" };
                mockConfigSvc.setConfig("mcpClients.client1", client1Config);

                yield* _(svc.registerClient(mockClient1));
                const initializedClient = yield* _(svc.getClient("client1"));

                expect(initializedClient).toEqual({
                    id: "client1-instance",
                    configUsed: client1Config,
                    ctxReceived: true,
                });
                expect(mockConfigSvc.getConfigEffect).toHaveBeenCalledWith("mcpClients.client1");
                expect(mockClient1InitFn).toHaveBeenCalledTimes(1);
                expect(mockClient1InitFn).toHaveBeenCalledWith(
                    client1Config,
                    expect.objectContaining({
                        loggingService: expect.anything(),
                        configurationService: expect.anything(),
                    })
                );
                expect(mockLogger.info).toHaveBeenCalledWith(
                    "Client initialized successfully", { clientId: "client1" }
                );
            }));

        it("should fail with ClientNotFoundError if the client ID does not exist", () =>
            Effect.gen(function* (_) {
                const { svc } = yield* _(getTestServiceAndMocks);

                const result = yield* _(
                    svc.getClient("nonexistent"),
                    Effect.catchTag("ClientNotFoundError", (e) => Effect.succeed(e)) // Catch specific tag
                );

                expect(result).toBeInstanceOf(ClientNotFoundError);
                expect(result.clientId).toBe("nonexistent");
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    "Client definition not found", { clientId: "nonexistent" }
                );
            }));

        it("should fail with ClientConfigurationError if config cannot be retrieved", () =>
            Effect.gen(function* (_) {
                const { svc, mocks } = yield* _(getTestServiceAndMocks);
                const mockConfigSvc = mocks.configSvc as MockConfigurationService;
                mockConfigSvc.clearConfig(); // Ensure config is missing

                yield* _(svc.registerClient(mockClient1));

                const result = yield* _(
                    svc.getClient("client1"),
                    Effect.catchTag("ClientConfigurationError", (e) => Effect.succeed(e))
                );

                expect(result).toBeInstanceOf(ClientConfigurationError);
                expect(result.clientId).toBe("client1");
                expect(result.message).toContain("Failed to retrieve configuration");
                expect(result.cause).toBeInstanceOf(Error); // From mock getConfigEffect failure
                expect(mockConfigSvc.getConfigEffect).toHaveBeenCalledWith("mcpClients.client1");
            }));

        it("should fail with ClientConfigurationError if retrieved config is invalid", () =>
            Effect.gen(function* (_) {
                const { svc, mocks } = yield* _(getTestServiceAndMocks);
                const mockConfigSvc = mocks.configSvc as MockConfigurationService;

                const invalidConfig = { wrongKey: "some-value" }; // Missing 'apiKey'
                mockConfigSvc.setConfig("mcpClients.client1", invalidConfig);

                yield* _(svc.registerClient(mockClient1));

                const result = yield* _(
                    svc.getClient("client1"),
                    Effect.catchTag("ClientConfigurationError", (e) => Effect.succeed(e))
                );

                expect(result).toBeInstanceOf(ClientConfigurationError);
                expect(result.clientId).toBe("client1");
                expect(result.message).toContain("Configuration validation failed");
                expect(result.cause).toBeInstanceOf(z.ZodError); // Should contain ZodError
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    "Client configuration validation failed",
                    expect.objectContaining({ clientId: "client1", issues: expect.stringContaining("apiKey: Required") })
                );
            }));

        it("should fail with ClientInitializationError if client initialize fails", () =>
            Effect.gen(function* (_) {
                const { svc, mocks } = yield* _(getTestServiceAndMocks);
                const mockConfigSvc = mocks.configSvc as MockConfigurationService;

                const validConfig = { url: "http://example.com" };
                mockConfigSvc.setConfig("mcpClients.initFails", validConfig);

                yield* _(svc.registerClient(mockClientInitFails));

                const result = yield* _(
                    svc.getClient("initFails"),
                    Effect.catchTag("ClientInitializationError", (e) => Effect.succeed(e))
                );

                expect(result).toBeInstanceOf(ClientInitializationError);
                expect(result.clientId).toBe("initFails");
                expect(result.message).toContain("Initialization failed");
                expect(result.cause).toBeInstanceOf(Error);
                expect((result.cause as Error).message).toBe("Initialization network failure");
                expect(mockClientInitFailsFn).toHaveBeenCalledTimes(1);
            }));

        it("should use cached result on subsequent calls for the same client", () =>
            Effect.gen(function* (_) {
                const { svc, mocks } = yield* _(getTestServiceAndMocks);
                const mockConfigSvc = mocks.configSvc as MockConfigurationService;

                const client1Config = { apiKey: "cached-key-456" };
                mockConfigSvc.setConfig("mcpClients.client1", client1Config);

                yield* _(svc.registerClient(mockClient1));

                // First call - should initialize
                const clientInstance1 = yield* _(svc.getClient("client1"));
                expect(mockClient1InitFn).toHaveBeenCalledTimes(1);
                expect(mockConfigService.getConfigEffect).toHaveBeenCalledTimes(1);

                // Second call - should hit cache
                const clientInstance2 = yield* _(svc.getClient("client1"));
                expect(mockClient1InitFn).toHaveBeenCalledTimes(1); // Not called again
                expect(mockConfigService.getConfigEffect).toHaveBeenCalledTimes(1); // Not called again
                expect(clientInstance2).toEqual(clientInstance1); // Should be the same instance/value

                // Third call - still cached
                const clientInstance3 = yield* _(svc.getClient("client1"));
                expect(mockClient1InitFn).toHaveBeenCalledTimes(1);
                expect(mockConfigService.getConfigEffect).toHaveBeenCalledTimes(1);
                expect(clientInstance3).toEqual(clientInstance1);
            }));

        it("should cache initialization failures", () =>
            Effect.gen(function* (_) {
                const { svc, mocks } = yield* _(getTestServiceAndMocks);
                const mockConfigSvc = mocks.configSvc as MockConfigurationService;

                const validConfig = { url: "http://fail.example.com" };
                mockConfigSvc.setConfig("mcpClients.initFails", validConfig);

                yield* _(svc.registerClient(mockClientInitFails));

                // First call - should fail initialization
                const result1 = yield* _(
                    svc.getClient("initFails"),
                    Effect.catchTag("ClientInitializationError", (e) => Effect.succeed(e))
                );
                expect(result1).toBeInstanceOf(ClientInitializationError);
                expect(mockClientInitFailsFn).toHaveBeenCalledTimes(1);
                expect(mockConfigService.getConfigEffect).toHaveBeenCalledTimes(1);


                // Second call - should return cached failure
                const result2 = yield* _(
                    svc.getClient("initFails"),
                    Effect.catchTag("ClientInitializationError", (e) => Effect.succeed(e))
                );
                expect(result2).toBeInstanceOf(ClientInitializationError);
                expect(mockClientInitFailsFn).toHaveBeenCalledTimes(1); // Not called again
                expect(mockConfigService.getConfigEffect).toHaveBeenCalledTimes(1); // Not called again
                expect(result2).toEqual(result1); // Should be the same error instance due to caching
            }));
    });
});
