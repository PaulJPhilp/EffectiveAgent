// e2e Gemini structured output test (direct Effect, no CLI)
// Run with: bun run src/e2e/usecase/gemini-structured.js

// Run with:
// EFFECTIVE_AGENT_MASTER_CONFIG=src/e2e/config/master-config.json bun run src/e2e/usecase/gemini-structured.js

import { Effect } from "effect";
import { runWithAgentRuntime } from "../../ea-agent-runtime/production-runtime.js";
import { AgentRuntimeService } from "../../ea-agent-runtime/index.js";
import { AgentRecordType } from "../../ea-agent-runtime/types.js";

const AGENT_ID = "structured-test-1";
const prompt =
  "Extract the following fields as JSON: name (string), age (integer) from this text: 'Name: Alice, Age: 30'. Return only valid JSON.";

const testEffect = Effect.gen(function* () {
  const agentRuntime = yield* AgentRuntimeService;
  yield* agentRuntime.create(AGENT_ID, {});
  yield* agentRuntime.send(AGENT_ID, {
    id: "activity-1",
    agentRuntimeId: AGENT_ID,
    timestamp: Date.now(),
    type: AgentRecordType.COMMAND,
    payload: {
      action: "generate_structured_output",
      prompt,
      model: "gemini"
    },
    metadata: {},
    sequence: 1
  });
  let result, tries = 0;
  while (tries++ < 20) {
    const state = yield* agentRuntime.getState(AGENT_ID);
    if (state.state && state.state.output) {
      result = state.state.output;
      break;
    }
    yield* Effect.sleep(500);
  }
  if (!result) {
    console.error("No output from agent after waiting.");
    process.exit(2);
  }
  console.log("Model output:\n", result);
  try {
    const parsed = JSON.parse(result);
    if (
      typeof parsed.name === "string" &&
      typeof parsed.age === "number"
    ) {
      console.log("Structured output test passed.");
      process.exit(0);
    } else {
      console.error("Output JSON does not have expected fields.");
      process.exit(2);
    }
  } catch (err) {
    console.error("Failed to parse model output as JSON:", err);
    process.exit(1);
  }
});

runWithAgentRuntime(testEffect);


