// Effect compatibility plugin for vitest
import { Effect } from "effect";

/** @type {import('vitest').PluginConfig} */
export default {
  name: "effect-compat",
  configResolved(config) {
    config.test = {
      ...config.test,
      globals: true,
      environment: "node",
    };
  },
  transform(code) {
    return {
      code,
      map: null,
    };
  },
  setup() {
    Effect.setGlobal("reset");
    return {
      teardown() {
        Effect.setGlobal("reset");
      },
    };
  },
};
