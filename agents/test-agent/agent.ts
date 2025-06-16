import { AgentRuntimeServiceApi } from "../../src/ea-agent-runtime/api.js";

// Simple test agent for CLI testing
export const testAgent = {
  name: "test-agent",
  description: "A simple test agent for CLI validation",
  version: "1.0.0"
};

export interface TestAgentState {
  input?: string;
  output?: string;
  status: "idle" | "processing" | "complete" | "error";
}

export class TestAgent {
  constructor(private readonly runtime: AgentRuntimeServiceApi) { }

  async run(input: string): Promise<void> {
    // Simple echo implementation
    const state: TestAgentState = {
      input,
      status: "processing"
    };

    try {
      // Echo the input as output
      state.output = `Test Agent received: ${input}`;
      state.status = "complete";
    } catch (err) {
      state.status = "error";
      state.output = String(err);
      throw err;
    }

    // Return void since state is managed by runtime
    return;
  }
}

// Factory function
export function createTestAgent(runtime: AgentRuntimeServiceApi): TestAgent {
  return new TestAgent(runtime);
}
