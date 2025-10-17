/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema } from "effect";
import { z } from "zod";
import type { ToolSchemaType } from "./types.js";

/**
 * Convert various schema formats to JSON Schema for tool definitions
 */
export function toJsonSchema(schema: ToolSchemaType): {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
} {
    // If Zod schema
    if (schema instanceof z.ZodType) {
        return zodToJsonSchema(schema);
    }

    // If Effect Schema
    if (isEffectSchema(schema as any)) {
        return effectSchemaToJsonSchema(schema as Schema.Schema<any, any, any>);
    }

    // If already JSON Schema object
    if (typeof schema === "object" && schema !== null && "type" in schema) {
        return schema as any;
    }

    throw new Error(
        `Unsupported schema type: ${typeof schema}. Expected Zod, Effect Schema, or JSON Schema object.`
    );
}

/**
 * Check if an object is an Effect Schema
 */
function isEffectSchema(obj: any): boolean {
    return (
        obj &&
        typeof obj === "object" &&
        (obj._tag === "SchemaType" || // Internal Effect marker
            typeof obj.pipe === "function" ||
            typeof obj.annotations === "function")
    );
}

/**
 * Convert Zod schema to JSON Schema
 */
function zodToJsonSchema(schema: z.ZodType<any, any, any>): {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
} {
    // Handle Zod objects
    if (schema instanceof z.ZodObject) {
        const shape = (schema as any).shape || {};
        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
            const fieldSchema = value as any;
            properties[key] = fieldSchemaToJsonSchema(fieldSchema);

            // Check if field is required (not optional)
            if (!(fieldSchema instanceof z.ZodOptional)) {
                required.push(key);
            }
        }

        return {
            type: "object",
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }

    // Fallback for simple types or non-object schemas
    return {
        type: "object",
        properties: {},
    };
}

/**
 * Convert individual Zod field to JSON Schema
 */
function fieldSchemaToJsonSchema(schema: any): any {
    const type = schema.type || schema._type;

    switch (type) {
        case "string":
        case "ZodString":
            return { type: "string" };
        case "number":
        case "ZodNumber":
            return { type: "number" };
        case "boolean":
        case "ZodBoolean":
            return { type: "boolean" };
        case "array":
        case "ZodArray":
            return {
                type: "array",
                items: schema.element ? fieldSchemaToJsonSchema(schema.element) : {},
            };
        case "object":
        case "ZodObject":
            return zodToJsonSchema(schema);
        case "optional":
        case "ZodOptional":
            return schema.schema ? fieldSchemaToJsonSchema(schema.schema) : {};
        case "union":
        case "ZodUnion":
            return { oneOf: (schema.options || []).map((opt: any) => fieldSchemaToJsonSchema(opt)) };
        default:
            return {};
    }
}

/**
 * Convert Effect Schema to JSON Schema
 * This is a simplified converter; Effect schemas are quite flexible
 */
function effectSchemaToJsonSchema(
    schema: Schema.Schema<any, any, any>
): {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
} {
    // Effect schemas are complex; we'll try to extract basic info
    // In practice, convert to Zod first if possible, or provide manual schema
    try {
        const annotations = (schema as any).annotations?.() || {};
        const description = annotations.description || "";

        // Attempt to infer from schema structure
        // This is a best-effort conversion
        return {
            type: "object",
            properties: {
                // Users should ideally provide the schema in a simpler format
                // or we handle specific Effect patterns
            },
            ...(description ? { description } : {}),
        };
    } catch {
        // Return empty schema if conversion fails
        return {
            type: "object",
            properties: {},
        };
    }
}

/**
 * Parse tool arguments using the provided schema
 */
export async function parseToolArguments(
    args: any,
    schema: ToolSchemaType
): Promise<{ success: true; data: any } | { success: false; error: string }> {
    try {
        if (schema instanceof z.ZodType) {
            const result = await schema.parseAsync(args);
            return { success: true, data: result };
        }

        if (isEffectSchema(schema as any)) {
            // Effect schema parsing
            try {
                const effectSchema = schema as Schema.Schema<any, any, any>;
                const result = await Schema.decodeUnknown(effectSchema)(args);
                return { success: true, data: result };
            } catch (err: any) {
                return {
                    success: false,
                    error: err?.message || "Effect schema validation failed",
                };
            }
        }

        // JSON Schema validation (basic)
        if (
            typeof schema === "object" &&
            schema !== null &&
            "type" in schema &&
            (schema as any).type === "object"
        ) {
            // Simple required fields check
            const required = (schema as any).required || [];
            for (const field of required) {
                if (!(field in args)) {
                    return {
                        success: false,
                        error: `Missing required field: ${field}`,
                    };
                }
            }
            return { success: true, data: args };
        }

        return { success: false, error: "Unknown schema type" };
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || "Failed to parse tool arguments",
        };
    }
}
