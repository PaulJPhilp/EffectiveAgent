import { Command } from "@effect/cli";
import { NodeFileSystem } from "@effect/platform-node";
import { Console, Effect, Either } from "effect"; // Added Either

// Placeholder for the actual validation logic/type from the framework
interface ValidationError {
    path: string;
    message: string;
}

// Mocked framework function
// Returns Effect<SuccessType, ErrorType, RequirementType>
// SuccessType: ValidationError[] - an array of validation errors (empty if valid)
// ErrorType: Error - for unexpected errors during the validation process itself
// RequirementType: never - no specific requirements for this mock
const validateProjectConfig = (): Effect.Effect<ValidationError[], Error, never> => {
    // In a real scenario, this would call the framework's validation logic.
    // To test error rendering, you can change this to return a list of errors:
    // return Effect.succeed([{ path: "ea-config/models.json", message: "Invalid model configuration." }] as ValidationError[]);
    // return Effect.fail(new Error("Simulated unexpected validation error")); // To test unexpected error
    return Effect.succeed([] as ValidationError[]); // Explicitly type the empty array
};

const validate = Command.make(
    "validate",
    {},
    (_args) =>
        Effect.gen(function* (_) {
            yield* _(Console.log("Validating project configuration..."));

            // Effect.either converts Effect<A, E, R> to Effect<Either<A, E>, never, R>
            // So, 'result' here will be Either<ValidationError[], Error>
            const result = yield* _(Effect.either(validateProjectConfig()));

            if (Either.isRight(result)) { // Use Either.isRight
                const errors = result.right; // Access the value using .right
                if (errors.length === 0) {
                    yield* _(Console.log("Project configuration is valid."));
                } else {
                    yield* _(Console.log("Project configuration validation failed:"));
                    for (const error of errors) {
                        yield* _(Console.log(`  - Path: ${error.path}, Error: ${error.message}`));
                    }
                }
            } else {
                // Handle unexpected errors from validateProjectConfig itself (Left side of Either)
                const unexpectedError = result.left; // Access the value using .left
                yield* _(Console.error("An unexpected error occurred during validation:"));
                yield* _(Console.error(unexpectedError.message));
            }
        }).pipe(Effect.provide(NodeFileSystem.layer)) // Keep NodeFileSystem.layer if Console needs it, or if future validation needs fs access.
);

export const configCommands = Command.make("config").pipe(
    Command.withSubcommands([validate])
);