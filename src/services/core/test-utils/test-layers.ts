/**
 * @file Test layers for pipeline services
 * @module services/core/test-utils/test-layers
 */

import { NodeContext, NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { AgentRuntimeService } from "@/agent-runtime/service.js";
import { IntelligenceService } from "@/services/capabilities/intelligence/service.js";
import { PersonaService } from "@/services/capabilities/persona/service.js";
import { SkillService } from "@/services/capabilities/skill/service.js";
import { SequenceGenerator } from "@/services/core/sequence/sequence-generator.js";
import { BridgeService } from "@/services/pipeline/bridge/service.js";
import { ChatHistoryService } from "@/services/pipeline/chat/service.js";
import { ExecutiveService } from "@/services/pipeline/executive-service/service.js";
import { InputService } from "@/services/pipeline/input/service.js";
import { PipelineService } from "@/services/pipeline/pipeline/service.js";
import ChatService from "@/services/pipeline/producers/chat/service.js";
import EmbeddingService from "@/services/pipeline/producers/embedding/service.js";
import ImageService from "@/services/pipeline/producers/image/service.js";
import ObjectService from "@/services/pipeline/producers/object/service.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import TranscriptionService from "@/services/pipeline/producers/transcription/service.js";

/**
 * Combined test layer for all pipeline services with AgentRuntime integration.
 * Includes all producer services, core pipeline services, capabilities services, and utilities.
 */
export const PipelineTestLayer = Layer.mergeAll(
    PipelineService.Default,
    AgentRuntimeService.Default,
    ExecutiveService.Default,
    InputService.Default,
    ChatHistoryService.Default,
    BridgeService.Default,
    ChatService.Default,
    EmbeddingService.Default,
    ImageService.Default,
    ObjectService.Default,
    TextService.Default,
    TranscriptionService.Default,
    PersonaService.Default,
    IntelligenceService.Default,
    SkillService.Default,
    SequenceGenerator.Default,
    // ConfigurationService.Default, // Temporarily removed - causes FileSystem issues in tests
    NodeContext.layer,
    NodeFileSystem.layer
);

/**
 * Capabilities test layer for just the capabilities services.
 * Use this when testing only capabilities services.
 */
export const CapabilitiesTestLayer = Layer.mergeAll(
    PersonaService.Default,
    IntelligenceService.Default,
    SkillService.Default,
    AgentRuntimeService.Default,
    NodeContext.layer,
    NodeFileSystem.layer
);

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
        effect.pipe(Effect.provide(CapabilitiesTestLayer)) as Effect.Effect<A, E, never>
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