/**
 * @file Test layers for pipeline services
 * @module services/core/test-utils/test-layers
 */

import { NodeContext, NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { ModelService } from "@/services/ai/model/service.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { PromptService } from "@/services/ai/prompt/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ToolService } from "@/services/ai/tools/service.js";
import { IntelligenceService } from "@/services/capabilities/intelligence/service.js";
import { PersonaService } from "@/services/capabilities/persona/service.js";
import { AttachmentService } from "@/services/core/attachment/service.js";
import { AuthService } from "@/services/core/auth/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { FileService } from "@/services/core/file/service.js";
import { TagService } from "@/services/core/tag/service.js";
import { WebSocketService } from "@/services/core/websocket/service.js";
import { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import { ResilienceService } from "@/services/execution/resilience/service.js";
import { ChatService } from "@/services/producers/chat/service.js";
import { EmbeddingService } from "@/services/producers/embedding/service.js";
import { ImageService } from "@/services/producers/image/service.js";
import { ObjectService } from "@/services/producers/object/service.js";
import { TextService } from "@/services/producers/text/service.js";
import { TranscriptionService } from "@/services/producers/transcription/service.js";

/**
 * Test layer that provides all services for integration testing
 * Note: Does not include AgentRuntimeService to maintain service independence
 */
export const TestServiceLayers = Layer.mergeAll(
  // Platform layers first
  NodeContext.layer,
  NodeFileSystem.layer,

  // Core services
  ConfigurationService.Default,
  FileService.Default,
  AuthService.Default,
  TagService.Default,
  AttachmentService.Default,
  WebSocketService.Default,
  ResilienceService.Default,
  OrchestratorService.Default,

  // AI services
  ProviderService.Default,
  ModelService.Default,
  PolicyService.Default,
  PromptService.Default,
  ToolRegistryService.Default,
  ToolService.Default,

  // Pipeline producer services
  ChatService.Default,
  TextService.Default,
  ImageService.Default,
  ObjectService.Default,
  EmbeddingService.Default,
  TranscriptionService.Default,

  // Capability services
  IntelligenceService.Default,
  PersonaService.Default
);

/**
 * Capabilities test layer for just the capabilities services.
 * Use this when testing only capabilities services.
 */
export const CapabilitiesTestLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeFileSystem.layer,
  PersonaService.Default,
  IntelligenceService.Default
);

/**
 * Pipeline test layer with all necessary dependencies
 */
export const PipelineTestLayer = TestServiceLayers;

/**
 * Simple test runner for pipeline services that provides all necessary dependencies.
 * Use this for most pipeline service unit tests.
 */
export const runPipelineTest = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Promise<A> => {
  return Effect.runPromise(
    effect.pipe(Effect.provide(PipelineTestLayer)) as Effect.Effect<A, E, never>
  );
};

/**
 * Test runner for capabilities services.
 * Use this when testing only capabilities services.
 */
export const runCapabilitiesTest = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Promise<A> => {
  return Effect.runPromise(
    effect.pipe(Effect.provide(CapabilitiesTestLayer)) as Effect.Effect<
      A,
      E,
      never
    >
  );
};

/**
 * Test runner that also provides access to the AgentRuntime for state inspection.
 * Use this when you need to verify agent state changes in tests.
 */
export const runPipelineTestWithRuntime = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Promise<A> => {
  return Effect.runPromise(
    effect.pipe(Effect.provide(PipelineTestLayer)) as Effect.Effect<A, E, never>
  );
};
