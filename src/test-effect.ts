import { Context, Effect, Layer } from "effect";

// Define a service with a tag
interface TestService {
    getValue: () => Effect.Effect<never, never, string>;
}

// Create a context for the service
const TestService = Context.GenericTag<TestService>("TestService");

// Implement the service
const TestServiceLive = Layer.succeed(
    TestService,
    {
        getValue: () => Effect.succeed("Test value")
    }
);

// Example program using the service
const program = Effect.gen(function* () {
    // The correct way to access a service in Effect.js v3.x
    const service = yield* TestService;
    const value = yield* service.getValue();
    return value;
});

// Run the program
async function main() {
    try {
        const result = await Effect.runPromise(program.pipe(
            Effect.provide(TestServiceLive)
        ));
        console.log("Result:", result);
    } catch (error) {
        console.error("Error:", error);
    }
}

main(); 