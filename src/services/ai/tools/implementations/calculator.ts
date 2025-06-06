/**
 * @file Implementation and schemas for the standard calculator tool.
 * @module services/tools/implementations/calculator
 */

import { Effect, Schema } from "effect";
// Assuming ToolExecutionError is defined in the parent errors file
import { ToolExecutionError } from "../errors.js";

// --- Schemas ---

/** Schema for the calculator's input object. */
export const calculatorInputSchema = Schema.Struct({
	/** The mathematical expression string to evaluate (e.g., "2 + 2 * 5"). */
	expression: Schema.String.pipe(Schema.minLength(1)),
});
export type CalculatorInput = Schema.Schema.Type<typeof calculatorInputSchema>;

/** Schema for the calculator's output object. */
export const calculatorOutputSchema = Schema.Struct({
	/** The numerical result of the calculation. */
	result: Schema.Number,
});
export type CalculatorOutput = Schema.Schema.Type<typeof calculatorOutputSchema>;

// --- Implementation ---

/**
 * The Effect function implementing the calculator logic.
 * Takes validated input and returns an Effect yielding the output or a ToolExecutionError.
 * WARNING: Uses Function constructor for evaluation, which has security risks.
 * Consider a safer math expression parser library for production use.
 */
export const calculatorImpl = (
	input: CalculatorInput,
): Effect.Effect<CalculatorOutput, ToolExecutionError> =>
	Effect.try({
		try: () => {
			// Use Function constructor as a slightly safer alternative to direct eval().
			// Still potentially vulnerable if input is not strictly controlled.
			const evaluatedResult = new Function(`return ${input.expression}`)();

			// Validate the result is a finite number
			if (typeof evaluatedResult !== "number" || !Number.isFinite(evaluatedResult)) {
				throw new Error(
					`Expression evaluated to non-finite number: ${evaluatedResult}`,
				);
			}
			// Return object matching the output schema
			return { result: evaluatedResult };
		},
		catch: (error) =>
			// Wrap any error during evaluation in a ToolExecutionError
			new ToolExecutionError({
				toolName: "calculator", // Hardcode tool name for error context
				input: input, // Include input for debugging
				module: "CalculatorTool",
				method: "calculatorImpl",
				cause: error instanceof Error ? error : new Error(String(error)), // Ensure cause is Error
			}),
	});
