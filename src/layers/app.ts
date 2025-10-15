import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Layer } from "effect";
import { AgentRuntimeService } from "@/ea-agent-runtime/service";
import { ModelService } from "@/services/ai/model/service";
import { PolicyService } from "@/services/ai/policy/service";
import { ProviderService } from "@/services/ai/provider/service";
import { ToolRegistryService } from "@/services/ai/tool-registry/service";
import { ConfigurationService } from "@/services/core/configuration/service";

/**
 * The main application layer, which composes all other layers into a single,
 * dependency-free layer that can be used to run the application.
 *
 * It merges the platform-specific layers (`NodeFileSystem`, `NodePath`) with all
 * the application's services. Effect's `Layer.mergeAll` resolves the
 * dependency graph, ensuring that services requiring `Path` or `FileSystem`
 * (like `ConfigurationService`) receive them from the context.
 */
export const AppLayer = Layer.mergeAll(
  // Platform services
  NodeFileSystem.layer,
  NodePath.layer,

  // Core services
  ConfigurationService.Default,

  // AI services
  ModelService.Default,
  ProviderService.Default,
  PolicyService.Default,
  ToolRegistryService.Default,

  // Top-level services
  AgentRuntimeService.Default
);

/**
 * The context of the main application layer.
 */
export type AppContext = Layer.Layer.Context<typeof AppLayer>;
