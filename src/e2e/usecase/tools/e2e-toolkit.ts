/**
 * @file Defines a toolkit for e2e tests.
 */

import { ToolkitSchema } from "@/services/ai/tool-registry/schema"
import { WeatherTool } from "./weather"
import { CalculatorTool } from "./calculator"

export default new ToolkitSchema({
  name: "e2e-tools",
  description: "A set of tools for end-to-end testing.",
  version: "1.0.0",
  tools: {
    get_weather: WeatherTool,
    calculator: CalculatorTool
  }
})
