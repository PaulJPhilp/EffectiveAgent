import { Data, Effect } from "effect";
import { z } from "zod";

// Import the core MCPClient types and context
import {
    type MCPClient,
    type MCPClientExecutionContext,
    ClientInitializationError, // Use this for init failures if any
} from "./mcp-client-service"; // Adjust path as needed

// --- Define Client-Specific Errors ---

/** Base error for calculator operations */
export class CalculatorError extends Data.TaggedError("CalculatorError")<{
    readonly message: string;
    readonly operation: string;
    readonly operands: number[];
    readonly cause?: unknown;
}> { }

/** Specific error for division by zero */
export class DivisionByZeroError extends Data.TaggedError("DivisionByZeroError")<{
    readonly message?: string;
    readonly operation: "divide";
    readonly operands: [number, number]; // Specifically [dividend, divisor]
}> { }

// --- Define the Client Instance Interface ---
// This is the object type returned by `initialize` and used by consumers

export interface CalculatorClientInstance {
    readonly add: (
        a: number,
        b: number
    ) => Effect.Effect<number, CalculatorError>;
    readonly subtract: (
        a: number,
        b: number
    ) => Effect.Effect<number, CalculatorError>;
    readonly multiply: (
        a: number,
        b: number
    ) => Effect.Effect<number, CalculatorError>;
    readonly divide: (
        a: number,
        b: number
    ) => Effect.Effect<number, CalculatorError | DivisionByZeroError>;
}

// --- Define the MCPClient Configuration Schema ---
// No configuration needed for this simple calculator.
const CalculatorConfigSchema = z.object({}).describe("No configuration required for the calculator client.");
type CalculatorConfig = z.infer<typeof CalculatorConfigSchema>;


// --- Implement the `initialize` Function ---

const initializeCalculator = (
    _config: CalculatorConfig, // Config is empty, ignored
    _context: MCPClientExecutionContext // Context ignored for this simple client
): Effect.Effect<CalculatorClientInstance, ClientInitializationError> => {
    // Initialization is trivial here, just create the object with methods.
    // No external calls or setup that could fail, so we directly succeed.
    return Effect.succeed({
        add: (a, b) => Effect.sync(() => a + b), // Simple sync operations wrapped in Effect
        subtract: (a, b) => Effect.sync(() => a - b),
        multiply: (a, b) => Effect.sync(() => a * b),
        divide: (a, b) => {
            if (b === 0) {
                return Effect.fail(
                    new DivisionByZeroError({
                        operation: "divide",
                        operands: [a, b],
                        message: "Division by zero is not allowed.",
                    })
                );
            }
            // Simulate potential unexpected errors for robustness, though unlikely here
            return Effect.try({
                try: () => a / b,
                catch: (unknownError) =>
                    new CalculatorError({
                        message: "An unexpected error occurred during division.",
                        operation: "divide",
                        operands: [a, b],
                        cause: unknownError,
                    }),
            });
        },
    });
};


// --- Define the MCPClient Definition Object ---

export const CalculatorMCPClient: MCPClient<
    "calculator", // Unique ID
    typeof CalculatorConfigSchema,
    CalculatorClientInstance // The type of the initialized client
> = {
    id: "calculator",
    name: "Simple Calculator Client",
    description: "Performs basic arithmetic operations (add, subtract, multiply, divide).",
    tags: ["math", "utility", "testing"],
    configSchema: CalculatorConfigSchema,
    initialize: initializeCalculator,
};

// --- Example Usage (Conceptual) ---
/*
import { Effect } from "effect";
import { MCPClientService } from "./mcp-client-service"; // Adjust path

const program = Effect.gen(function* (_) {
    const mcpService = yield* _(MCPClientService);

    // Register the client (usually done at application startup)
    yield* _(mcpService.registerClient(CalculatorMCPClient));

    // Get the initialized client instance
    // Note: Type assertion might be needed if getClient returns unknown by default,
    // or use type parameter <typeof CalculatorMCPClient>
    const calculator = yield* _(mcpService.getClient("calculator")); // Type is CalculatorClientInstance

    // Use the client's methods
    const sum = yield* _(calculator.add(5, 3));
    console.log(`Sum: ${sum}`); // Output: Sum: 8

    const quotient = yield* _(calculator.divide(10, 2));
    console.log(`Quotient: ${quotient}`); // Output: Quotient: 5

    // Handle specific errors
    const divisionError = yield* _(
        calculator.divide(5, 0),
        Effect.catchTag("DivisionByZeroError", (e) => {
            console.error(`Caught expected error: ${e.message}`);
            return Effect.succeed("Handled division by zero");
        })
    );
    console.log(divisionError); // Output: Handled division by zero

});

// Run the program with necessary layers (MCPClientServiceLiveLayer, etc.)
// Effect.runPromise(Effect.provide(program, CombinedLayers));
*/
