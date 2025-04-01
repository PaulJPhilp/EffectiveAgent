// File: src/shared/services-effect/configuration/schema.ts

import { z } from 'zod';

/**
 * Common schema for tags field used across various configurations
 */
export const TagsSchema = z.array(z.string());

/**
 * Base configuration schema.
 * Defines common fields expected in most configuration files or objects.
 */
export const BaseConfigSchema = z.object({
	name: z.string()
		.min(1, { message: "Configuration name is required" })
		.describe("Configuration name"),
	version: z.string()
		.min(1, { message: "Configuration version is required" })
		.describe("Configuration version"),
	description: z.string().optional()
		.describe("Optional description of this configuration"),
	tags: TagsSchema
}).strict();

/**
 * Environment-aware configuration schema, extending the base.
 */
export const EnvironmentConfigSchema = BaseConfigSchema.extend({
	environment: z.enum(['development', 'production', 'test'])
		.describe("The runtime environment."),
	debug: z.boolean().optional().default(false)
		.describe("Indicates if debug mode should be enabled.")
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
