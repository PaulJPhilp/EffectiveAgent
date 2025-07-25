/**
 * @file Type definitions for the Persona capability service.
 */

import { Schema } from "effect";
import { Persona } from "./schema.js";

// Define types from Schema first
export type PersonaDefinition = Schema.Schema.Type<typeof Persona>;
export type PersonaDefinitionInput = Schema.Schema.Type<typeof Persona>; 