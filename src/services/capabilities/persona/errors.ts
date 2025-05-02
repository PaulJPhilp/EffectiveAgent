/**
 * @file Defines specific errors for the Persona capability service.
 * @module services/capabilities/persona/errors
 */

import { EntityParseError } from "@/services/core/errors.js";
import { EffectiveError } from "@/effective-error.js";

/**
 * Error thrown when there are issues with persona configuration.
 * @extends EffectiveError
 */
export class PersonaConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: EntityParseError;
    }) {
        super(params);
    }
}
