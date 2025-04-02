import { ToolExecutionError } from "../../errors/index.js";

/**
 * Base class for date/time tool specific errors
 */
export class DateTimeError extends ToolExecutionError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, {
            toolId: options?.toolId ?? "date-time",
            cause: options?.cause
        })
        this.name = "DateTimeError"
        Object.setPrototypeOf(this, DateTimeError.prototype)
    }
}

/**
 * Error thrown when date/time validation fails (e.g., invalid format, invalid date)
 */
export class ValidationError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "ValidationError"
        Object.setPrototypeOf(this, ValidationError.prototype)
    }
}

/**
 * Error thrown when date/time conversion fails (e.g., invalid timezone, unsupported format)
 */
export class ConversionError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "ConversionError"
        Object.setPrototypeOf(this, ConversionError.prototype)
    }
}

/**
 * Error thrown when date/time calculations fail (e.g., invalid duration, overflow)
 */
export class CalculationError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "CalculationError"
        Object.setPrototypeOf(this, CalculationError.prototype)
    }
}

/**
 * Error thrown when parsing date/time strings fails
 */
export class ParseError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "ParseError"
        Object.setPrototypeOf(this, ParseError.prototype)
    }
}

/**
 * Error thrown when formatting date/time fails
 */
export class FormatError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "FormatError"
        Object.setPrototypeOf(this, FormatError.prototype)
    }
}

/**
 * Error thrown when an operation is not supported
 */
export class UnsupportedOperationError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "UnsupportedOperationError"
        Object.setPrototypeOf(this, UnsupportedOperationError.prototype)
    }
}

/**
 * Error thrown when required parameters are missing
 */
export class MissingParameterError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "MissingParameterError"
        Object.setPrototypeOf(this, MissingParameterError.prototype)
    }
}

/**
 * Error thrown when an unexpected error occurs that doesn't match any other error type
 */
export class UnknownError extends DateTimeError {
    constructor(message: string, options?: { cause?: Error; toolId?: string }) {
        super(message, options)
        this.name = "UnknownError"
        Object.setPrototypeOf(this, UnknownError.prototype)
    }
} 