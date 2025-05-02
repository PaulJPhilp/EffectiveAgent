/**
 * @file Defines specific errors for the Intelligence capability service.
 * @module services/capabilities/intelligence/errors
 */

import { EffectiveError } from "@/errors.js";

/**
 * Represents an error occurring during the validation or update
 * of an Intelligence definition against its schema.
 * @extends EffectiveError
 */
export class IntelligenceConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        super(params);
    }
}
