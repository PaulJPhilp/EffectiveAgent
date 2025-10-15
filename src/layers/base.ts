import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Layer } from "effect";
import { ConfigurationService } from "@/services/core/configuration/service";

/**
 * The BaseLayer provides foundational, cross-cutting services that other
 * modules in the application can depend on. It has no requirements of its own.
 *
 * It includes services for:
 * - File System Access (`NodeFileSystem`)
 * - Path Manipulation (`NodePath`)
 * - Configuration Management (`ConfigurationService`)
 */

const PlatformLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);

/**
 * The base layer, which provides foundational services like configuration and file system access.
 * This layer should have no requirements.
 */
export const BaseLayer = Layer.provide(
  ConfigurationService.Default,
  PlatformLayer
);

/**
 * The context type provided by the BaseLayer. This can be used in effects
 * that require access to these foundational services.
 */
export type BaseContext = Layer.Layer.Context<typeof BaseLayer>;
