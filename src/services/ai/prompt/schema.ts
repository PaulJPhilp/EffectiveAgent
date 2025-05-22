/**
 * @file Defines Effect schemas for Prompt definitions and configurations.
 */

import { Description, Metadata, Name } from "@/schema.js";
import { Schema as S } from "effect";

// Schema for a single named Prompt Definition structure
// Export this directly if needed elsewhere
export class Prompt extends S.Class<Prompt>("Prompt")({
  name: Name,
  description: S.optional(Description),
  template: S.String.pipe(S.minLength(1)),
  metadata: S.optional(Metadata)
}) { }

// Schema for the root configuration file structure
// Export this directly - this is what PromptConfigLiveLayer will validate against
export class PromptFile extends S.Class<PromptFile>("PromptFile")({
    name: Name,
    version: S.String, // Changed to required String
    prompts: S.Array(Prompt).pipe(S.minItems(1)),
    metadata: S.optional(Metadata),
    description: S.optional(Description)
}) { }