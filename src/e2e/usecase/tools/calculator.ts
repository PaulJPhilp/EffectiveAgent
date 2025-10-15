// @ts-check
/**
 * @file Calculator tool implementation for e2e tests.
 */

import { RegistryToolSchema } from "@/services/ai/tool-registry/schema";
import { calculatorImpl, calculatorInputSchema, calculatorOutputSchema } from "@/services/ai/tools/implementations/calculator";
import { EffectImplementation } from "@/services/ai/tools/schema";

export const CalculatorTool = new RegistryToolSchema({
  metadata: {
    name: "calculator",
    description: "A calculator tool for performing mathematical calculations",
    version: "1.0.0",
    author: "system"
  },
  implementation: new EffectImplementation({
    _tag: "EffectImplementation",
    inputSchema: calculatorInputSchema,
    outputSchema: calculatorOutputSchema,
    execute: calculatorImpl
  })
});
