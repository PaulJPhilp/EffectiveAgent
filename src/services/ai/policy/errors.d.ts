import { EffectiveError } from "@/errors.js";
/**
 * Base error class for all policy service related errors
 */
export declare class PolicyError extends EffectiveError {
    constructor(params: {
        description: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when policy validation fails
 */
export declare class PolicyValidationError extends PolicyError {
    constructor(params: {
        description: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when policy check fails
 */
export declare class PolicyCheckError extends PolicyError {
    constructor(params: {
        description: string;
        method: string;
        cause?: unknown;
    });
}
/**
 * Error thrown when there's an issue recording policy outcome
 */
export declare class PolicyRecordError extends PolicyError {
    constructor(params: {
        description: string;
        method: string;
        cause?: unknown;
    });
}
//# sourceMappingURL=errors.d.ts.map