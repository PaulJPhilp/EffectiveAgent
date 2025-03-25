import { ConfigurationError, type ValidationResult } from '../types.js';

/** Schema validation options */
interface SchemaValidationOptions {
    readonly allowUnknownKeys?: boolean;
    readonly strictNullChecks?: boolean;
}

/** Type guard for checking if value is a plain object */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && 
    value !== null && 
    !Array.isArray(value);

/** Validate required fields in configuration object */
export const validateRequiredFields = (
    config: unknown,
    fields: readonly string[]
): ValidationResult => {
    if (!isPlainObject(config)) {
        return {
            isValid: false,
            errors: ['Configuration must be an object']
        };
    }

    const missingFields = fields.filter(field => !(field in config));
    if (missingFields.length > 0) {
        return {
            isValid: false,
            errors: [`Missing required fields: ${missingFields.join(', ')}`]
        };
    }

    return { isValid: true };
};

/** Compose multiple validation results */
export const composeValidations = (
    ...validations: readonly ValidationResult[]
): ValidationResult => {
    const errors = validations
        .filter(v => !v.isValid)
        .flatMap(v => v.errors ?? []);

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
};

/** Create a type-safe validator function */
export const createValidator = <T>(
    validate: (value: unknown) => ValidationResult
) => (
    value: unknown,
    options: SchemaValidationOptions = {}
): T => {
    const result = validate(value);
    if (!result.isValid) {
        throw new ConfigurationError({
            name: 'ValidationError',
            message: result.errors?.join(', ') ?? 'Validation failed',
            code: 'SCHEMA_VALIDATION_ERROR'
        });
    }
    return value as T;
};
