/**
 * Supported operations for the date/time tool
 */
export const DateTimeOperation = {
    PARSE: "parse",
    FORMAT: "format",
    CONVERT: "convert",
    CALCULATE: "calculate",
    VALIDATE: "validate"
} as const

export type DateTimeOperation = typeof DateTimeOperation[keyof typeof DateTimeOperation]

/**
 * Supported format types for date/time output
 */
export const FormatType = {
    ISO: "iso",
    RFC: "rfc",
    LONG: "long",
    SHORT: "short",
    RELATIVE: "relative",
    CUSTOM: "custom"
} as const

export type FormatType = typeof FormatType[keyof typeof FormatType]

/**
 * Supported calculation types for date/time operations
 */
export const CalculationType = {
    ADD: "add",
    SUBTRACT: "subtract",
    DIFFERENCE: "difference",
    START_OF: "startOf",
    END_OF: "endOf",
    BUSINESS_DAYS: "businessDays",
    AGE: "age"
} as const

export type CalculationType = typeof CalculationType[keyof typeof CalculationType]

/**
 * Input parameters for date/time calculations
 */
export interface CalculationParams {
    type: CalculationType
    amount?: number
    unit?: string
    to?: string
    roundingMode?: string
    businessDays?: {
        holidays?: string[]
        weekendDays?: number[]
    }
}

/**
 * Input schema for the date/time tool
 */
export interface DateTimeInput {
    operation: DateTimeOperation
    value: string
    params?: {
        from?: string
        to?: string | FormatType
        locale?: string
        calendar?: string
        calculation?: CalculationParams
        pattern?: string
    }
}

/**
 * Time zone information
 */
export interface TimeZoneInfo {
    name: string
    offset: string
}

/**
 * Calculation result details
 */
export interface CalculationDetails {
    start: string
    end: string
    duration: string
}

/**
 * Output schema for the date/time tool
 */
export interface DateTimeOutput {
    result: string | boolean | number
    details?: {
        parsed?: any // Temporal objects can't be typed directly
        timeZone?: TimeZoneInfo
        calculation?: CalculationDetails
    }
    meta?: {
        warnings?: string[]
        alternatives?: string[]
    }
}

/**
 * Error response format
 */
export interface ErrorResponse {
    error: {
        code: string
        message: string
        details?: unknown
        suggestions?: string[]
    }
} 