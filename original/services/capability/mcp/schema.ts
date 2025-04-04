import { z } from "zod";

/**
 * Zod schema for the configuration object of a single MCP client
 * as it appears in the main configuration file.
 *
 * Note: We use `z.record(z.string(), z.unknown())` here because the specific
 * fields and their types (e.g., apiKey: string, timeout: number) are defined
 * by each individual client's `configSchema`. The `MCPClientService` performs
 * that specific validation later when `getClient` is called. This top-level
 * schema just ensures it's an object containing key-value pairs.
 */
const clientConfigValueSchema = z
    .record(z.string(), z.unknown())
    .describe(
        "Represents the configuration object for a single MCP client. Specific fields are validated later."
    );

/**
 * Zod schema for the `mcpClients` section within the main configuration.
 * This section holds configuration objects for multiple MCP clients,
 * keyed by their unique client IDs.
 */
const mcpClientsSchema = z
    .record(
        z.string().min(1), // Key: The non-empty clientId (e.g., "gmail", "hubspot")
        clientConfigValueSchema // Value: The configuration object for that client
    )
    .describe(
        "Holds configuration objects for various MCP clients, keyed by client ID."
    );

/**
 * Zod schema for the overall application configuration, focusing on the
 * structure required for the MCPClientService.
 *
 * Use `.extend({...})` to add other application-specific configuration sections
 * or `.passthrough()` if you want to allow other top-level keys without defining them.
 */
export const AppConfigurationSchema = z
    .object({
        /**
         * Optional section containing configurations for all registered MCP clients.
         * If present, it must be an object where keys are client IDs and values
         * are the corresponding configuration objects.
         */
        mcpClients: mcpClientsSchema.optional(),

        // --- Example other configuration sections ---
        // Add other top-level configuration keys your application needs here.
        // You can make them optional or required as needed.
        /*
        logging: z.object({
            level: z.enum(["debug", "info", "warn", "error"]).default("info"),
            prettyPrint: z.boolean().optional()
        }).optional(),

        server: z.object({
            port: z.number().int().positive().default(3000),
            host: z.string().default("localhost")
        }).optional(),
        */
    })
    // Using passthrough() allows keys not explicitly defined in this schema.
    // Remove this if you want strict validation of only defined keys.
    .passthrough()
    .describe(
        "Schema for the main application configuration, including the optional mcpClients section."
    );

// --- Type Inference ---

/**
 * Represents the inferred type of the application configuration object
 * validated by `AppConfigurationSchema`.
 */
export type AppConfiguration = z.infer<typeof AppConfigurationSchema>;

// --- Example Usage ---

/*
// Example of a configuration object that would be valid:
const validConfig: AppConfiguration = {
  someOtherKey: "allowed by passthrough",
  mcpClients: {
    gmail: {
      // These specific fields (clientId, clientSecret) are NOT validated
      // by AppConfigurationSchema itself, but by the Gmail MCPClient's
      // own configSchema during MCPClientService.getClient("gmail").
      clientId: "your-client-id.apps.googleusercontent.com",
      clientSecret: "YOUR_SECRET",
      scopes: ["https://mail.google.com/"],
      "arbitrary-key": 123 // Allowed here because value is z.unknown()
    },
    hubspot: {
      apiKey: "hubspot-api-key",
      portalId: "1234567"
    },
    "custom-crm": {
      baseUrl: "https://api.custom.com",
      token: "abc"
    }
  },
  logging: { // Example other section
    level: "debug"
  }
};

// Example of a configuration object without any MCP clients:
const validConfigNoMcps: AppConfiguration = {
  logging: {
    level: "info"
  }
};

// Example of a configuration object with an empty mcpClients section:
const validConfigEmptyMcps: AppConfiguration = {
  mcpClients: {}
};

// Example of how the MCPClientService would use this:
// 1. Load the entire config object (e.g., from a file or env vars).
// 2. Validate it using `AppConfigurationSchema.safeParse(loadedConfig)`.
// 3. If valid, provide the `ConfigurationService` with the parsed config.
// 4. When `MCPClientService.getClient("gmail")` is called:
//    a. It asks `ConfigurationService` for the object at path `mcpClients.gmail`.
//    b. It retrieves the specific `gmailClientDefinition.configSchema` (e.g., z.object({ clientId: z.string(), ... })).
//    c. It validates the object from step (a) using the schema from step (b).
//    d. If *that* validation passes, it proceeds with initialization.
*/
