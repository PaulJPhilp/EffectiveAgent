/**
 * Example test using the Effect test harness with external dependencies
 * 
 * This demonstrates how to use the test harness with services
 * that depend on other services.
 */

import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { createServiceTestHarness } from "../effect-test-harness.js";

// --- First, we define a Config service that will be a dependency ---

interface ConfigServiceInterface {
    readonly getValue: (key: string) => Effect.Effect<string, ConfigError>;
}

class ConfigError extends Error {
    readonly _tag = "ConfigError";
    constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}

class ConfigService extends Context.Tag("ConfigService")<
    ConfigService,
    ConfigServiceInterface
>() { }

// --- Now define the main service that depends on ConfigService ---

interface MessageServiceInterface {
    readonly getMessage: () => Effect.Effect<string, ConfigError>;
    readonly getFormattedMessage: (prefix: string) => Effect.Effect<string, ConfigError>;
}

class MessageService extends Context.Tag("MessageService")<
    MessageService,
    MessageServiceInterface
>() { }

// --- Implement the ConfigService for testing ---

const createConfigImpl = () => {
    return Effect.gen(function* () {
        // A simple in-memory store for config values
        const configStore = new Map<string, string>();
        configStore.set("message", "Hello, World!");
        configStore.set("empty", "");

        const getValue = (key: string): Effect.Effect<string, ConfigError> => {
            const value = configStore.get(key);
            if (value === undefined) {
                return Effect.fail(new ConfigError(`Config key ${key} not found`));
            }
            return Effect.succeed(value);
        };

        return { getValue };
    });
};

// Create a layer for the config service
const ConfigServiceLive = Layer.effect(
    ConfigService,
    createConfigImpl()
);

// --- Implement the MessageService that depends on ConfigService ---

const createMessageServiceImpl = () => {
    return Effect.gen(function* () {
        // Access the dependency
        const configService = yield* ConfigService;

        const getMessage = (): Effect.Effect<string, ConfigError> => {
            return configService.getValue("message");
        };

        const getFormattedMessage = (prefix: string): Effect.Effect<string, ConfigError> => {
            return Effect.gen(function* () {
                const message = yield* configService.getValue("message");
                return `${prefix}: ${message}`;
            });
        };

        return {
            getMessage,
            getFormattedMessage
        };
    });
};

// --- Create the test harness with dependencies ---

const messageServiceHarness = createServiceTestHarness(
    MessageService,
    createMessageServiceImpl,
    ConfigServiceLive // Provide the dependency layer
);

// --- Tests ---

describe("MessageService with dependencies", () => {
    it("should get a message from config", async () => {
        const effect = Effect.gen(function* () {
            const messageService = yield* MessageService;
            const message = yield* messageService.getMessage();
            return message;
        });

        await expect(messageServiceHarness.runTest(effect)).resolves.toBe("Hello, World!");
    });

    it("should format the message", async () => {
        const effect = Effect.gen(function* () {
            const messageService = yield* MessageService;
            const message = yield* messageService.getFormattedMessage("Greeting");
            return message;
        });

        await expect(messageServiceHarness.runTest(effect)).resolves.toBe("Greeting: Hello, World!");
    });

    it("should handle errors", async () => {
        const effect = Effect.gen(function* () {
            const configService = yield* ConfigService;
            return yield* configService.getValue("non-existent-key");
        });

        await messageServiceHarness.expectError(effect, "ConfigError");
    });
}); 