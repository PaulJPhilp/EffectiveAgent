import { Effect, Layer } from "effect";
import { AgentRuntimeService } from "@/ea-agent-runtime/service";
import { PolicyService } from "@/services/ai/policy/service";
import { ToolRegistryService } from "@/services/ai/tool-registry/service";

/**
 * The ExecutionModuleLayer provides services responsible for agent execution,
 * tool management, and policy enforcement.
 *
 * It requires the `BaseLayer` and `AiModuleLayer` for its dependencies.
 */
export const ExecutionModuleLayer = Layer.mergeAll(
  ToolRegistryService.Default,
  PolicyService.Default,
  AgentRuntimeService.Default
);

/**
 * The context type provided by the ExecutionModuleLayer.
 */
export type ExecutionModuleContext = Layer.Layer.Context<typeof ExecutionModuleLayer>;
