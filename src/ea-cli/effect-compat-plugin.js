// Effect compatibility plugin for vitest
import { Effect } from "effect"

/** @type {import('vitest').PluginConfig} */
export default {
  name: "effect-compat",
  configResolved(config) {
    config.test = {
      ...config.test,
      globals: true,
      environment: "node",
      testTimeout: 5000, // 5 seconds
      hookTimeout: 5000, // 5 seconds
    }
  },
  transform(code) {
    return {
      code,
      map: null,
    }
  },
  setup() {
    return {
      onTestFinished() {
        // Reset Effect state after each test
        Effect.runFork(Effect.unit)
      },
    }
  },
}
