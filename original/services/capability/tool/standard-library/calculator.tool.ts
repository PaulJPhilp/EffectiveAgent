import { Effect } from "effect"
import { z } from "zod"
import { ToolExecutionError } from "../errors/index.ts"
import type { Tool, ToolExecutionContext } from "../types/index.ts"

// Define the input schema for the calculator tool
const CalculatorInputSchema = z.object({
    expression: z.string().trim().min(1, { message: "Expression cannot be empty" })
        .describe("The mathematical expression to evaluate (e.g., '2 + 3'). Currently only supports simple addition.")
})

// Define the output schema for the calculator tool
const CalculatorOutputSchema = z.object({
    result: z.number().describe("The numerical result of the evaluation.")
})

/**
 * A simple calculator tool that evaluates basic mathematical expressions.
 * Currently only supports addition of two numbers (e.g., "5 + 8").
 */
export const calculatorTool: Tool<typeof CalculatorInputSchema, typeof CalculatorOutputSchema> = {
    id: "calculator",
    name: "Calculator",
    description:
        "Evaluates basic mathematical expressions. Input should be a string like 'number + number'.",
    inputSchema: CalculatorInputSchema,
    outputSchema: CalculatorOutputSchema,
    tags: ["math", "calculation"],

    execute: (input: z.infer<typeof CalculatorInputSchema>, context: ToolExecutionContext) =>
        Effect.gen(function* (_) {
            const log = yield* _(context.loggingService.getLogger("CalculatorTool"))
            yield* _(log.debug("Executing calculator tool", { input: input.expression }))

            // Simple parser for "number + number" format
            const parts = input.expression.split('+').map(part => part.trim());
            if (parts.length !== 2) {
                return yield* _(Effect.fail(new ToolExecutionError(
                    `Invalid expression format. Expected 'number + number', received: ${input.expression}`,
                    { toolId: calculatorTool.id, cause: new Error("InvalidFormat") }
                )));
            }

            const num1 = Number.parseFloat(parts[0]);
            const num2 = Number.parseFloat(parts[1]);

            if (Number.isNaN(num1) || Number.isNaN(num2)) {
                return yield* _(Effect.fail(new ToolExecutionError(
                    `Invalid numbers in expression: ${input.expression}. Parts: ${parts[0]}, ${parts[1]}`,
                    { toolId: calculatorTool.id, cause: new Error("InvalidNumber") }
                )));
            }

            const result = num1 + num2;
            yield* _(log.info("Calculation successful", { expression: input.expression, result }))

            return { result };
        }).pipe(Effect.annotateLogs({ toolId: calculatorTool.id }))
}; 