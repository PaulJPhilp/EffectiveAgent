/**
 * @file Defines Effect schemas for Prompt definitions and configurations.
 */

import { Metadata, Name } from "@/schema.js";
import { Schema as S } from "effect";

// Schema for a single named Prompt Definition structure
// Export this directly if needed elsewhere
export class Prompt extends S.Class<Prompt>("Prompt")({
    name: Name,
    description: S.optional(S.String),
    template: S.String.pipe(S.minLength(1)),
    metadata: S.optional(Metadata)
}) { }

// Schema for the root configuration file structure
// Export this directly - this is what PromptConfigLiveLayer will validate against
export const PromptsFile = S.Struct({
    prompts: S.Array(Prompt).pipe(S.minItems(1))
});