/**
 * @file Defines Zod schemas for Personality definitions and their configuration.
 * Personalities define communication style, tone, and output constraints.
 */

import { z } from "zod";
import type { JsonObject } from "../../types.js"; // Adjust path if needed

// --- Main Persona Definition Schema ---

export const PersonaSchema = z.object({
    /** Unique name/identifier for the personality (e.g., "formal", "witty", "codeHelper"). */
    name: z.string().min(1),
    /** User-friendly description. */
    description: z.string().optional(),
    /**
     * The core system prompt fragment defining the persona's identity, tone, and style.
     * This will likely be combined with task-specific instructions later.
     */
    systemPrompt: z.string().min(1),
    /** Optional: Specific constraints or instructions for output formatting or behavior. */
    outputConstraints: z.array(z.string()).optional().default([]),
    /**
     * Optional: Default parameters that might influence style (e.g., lower temperature for formal).
     * These could potentially be merged with Intelligence/Skill parameters.
     */
    defaultParams: z.object({
        temperature: z.number().min(0).max(2).optional(),
        // Add other relevant parameters like topP, presencePenalty if style-related
    }).strict().optional(),
    /** Optional: Standard greeting template (using LiquidJS format?). */
    // greetingTemplate: z.string().optional(),
    /** Optional: Standard refusal template (using LiquidJS format?). */
    // refusalTemplate: z.string().optional(),
    /** Optional: Other metadata. */
    metadata: z.record(z.unknown()).optional(),
});
// Define the TypeScript type derived from the schema
export type Persona = z.infer<typeof PersonaSchema>;

// Schema for the root configuration file (e.g., personas.json)
export const PersonasConfigSchema = z.object({
    personas: z.array(PersonaSchema).min(1),
    // Optional: Define a default persona?
    // defaultPersonaName: z.string().optional().refine(...)
});
export type PersonasConfig = z.infer<typeof PersonasConfigSchema>;
