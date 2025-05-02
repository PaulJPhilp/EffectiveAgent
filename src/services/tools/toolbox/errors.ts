import { EffectiveError } from "@/effective-error.js";

/**
 * Represents an error occurring during the validation or update
 * of a Workbench configuration.
 * @extends EffectiveError
 */
export class WorkbenchConfigError extends EffectiveError {
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        super(params);
    }
}