---
trigger: model_decision
description: 
globs: 
---
When: You have an Effect that yields an Option<A> (e.g., after a findById call, or any operation that might not return a value), and you need to perform different effectful actions based on whether the Option is Some<A> or None.

Problem: Using Effect.gen with if (Option.isNone(result)) { yield* Effect.fail(...) } else { ... } can sometimes lead to confusing TypeScript type inference errors (like TS2322), where the compiler struggles to determine the exact success (A), error (E), or requirement (R) types of the overall Effect.gen block, potentially inferring unknown or undefined incorrectly.

Preferred Pattern: Use Effect.flatMap combined with Option.match.
```
import { Effect, Option } from "effect";

// Assume previousEffect: Effect.Effect<Option<MyType>, SomeError, SomeRequirement>

const resultingEffect = previousEffect.pipe(
  Effect.flatMap(Option.match({
    // Handler for the None case (value is absent)
    onNone: () => {
      // Typically fail with a specific error indicating "not found"
      return Effect.fail(new NotFoundError("Resource not found"));
      // Or, if appropriate, succeed with a default value:
      // return Effect.succeed(defaultValue);
    },
    // Handler for the Some case (value is present)
    onSome: (actualValue: MyType) => {
      // Perform further effectful operations using actualValue
      return Effect.gen(function* () {
        // Example: Use the value in another service call
        const nextResult = yield* someOtherService.process(actualValue);
        // ... more steps ...
        return nextResult; // Return the final success value for this branch
      }).pipe(
        // Map errors specific to this branch if necessary
        Effect.mapError((cause) => new ProcessingError("Failed during processing", { cause }))
      );
    }
  }))
  // The resultingEffect's type signature will correctly combine:
  // A: The success type from the onSome branch (or onNone if it succeeds)
  // E: The union of errors from previousEffect, onNone (fail), and onSome (fail/mapError)
  // R: The union of requirements from previousEffect and the onSome branch
);
```

Benefits:

Improved Type Inference: This pattern explicitly defines the control flow and the resulting Effect type for both the Some and None cases, generally leading to more reliable type inference by TypeScript.
Clearer Separation: It clearly separates the logic for handling the presence or absence of the value.
Explicit Error Handling: The onNone branch provides a natural place to introduce specific "not found" errors into the Effect's error channel (E).
Composition: It aligns well with Effect's compositional nature, using standard operators (flatMap, match) designed for these scenarios.

Recommendation: When handling an Option resulting from an Effectful operation where the subsequent steps are also Effectful and differ based on the Option's state, prefer using Effect.flatMap(Option.match({ onNone: ..., onSome: ... })) over conditional logic within Effect.gen.
