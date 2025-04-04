import { Context, Data, Effect } from "effect";
import { type z } from "zod";

// Assuming these services/types are defined elsewhere and imported
import { type ConfigurationService } from "../configuration/configuration-service.js"; // Adjust path
import { type ILoggingService } from "../logging/types/index.js"; // Adjust path

// --- Error Types ---

/** Base error for MCPClientService operations. */
export type MCPClientError =
    | ClientRegistrationError
    | ClientNotFoundError
    | ClientConfigurationError
    | ClientInitializationError;

/** Error indicating a client with the same ID is already registered. */
export class ClientRegistrationError extends Data.TaggedError(
    "ClientRegistrationError"
)<{
    readonly clientId: string;
    readonly message: string;
}> { }

/** Error indicating the requested client ID was not found in the registry. */
export class ClientNotFoundError extends Data.TaggedError("ClientNotFoundError")<{
    readonly clientId: string;
    readonly message: string;
}> { }

/** Error indicating a failure in fetching or validating client configuration. */
export class ClientConfigurationError extends Data.TaggedError(
    "ClientConfigurationError"
)<{
    readonly clientId: string;
    readonly message: string;
    readonly cause?: unknown; // Can store ZodError issues or other underlying errors
}> { }

/** Error indicating a failure during the client's specific initialization logic. */
export class ClientInitializationError extends Data.TaggedError(
    "ClientInitializationError"
)<{
    readonly clientId: string;
    readonly message: string;
    readonly cause?: unknown; // Stores the error thrown by the client's initialize function
}> { }

// --- Core Structures ---

/**
 * Context provided to the `initialize` function of an MCPClient definition.
 * Contains necessary framework services.
 */
export interface MCPClientExecutionContext {
    readonly loggingService: ILoggingService;
    readonly configurationService: ConfigurationService;
    // Potentially other shared services can be added here
}

/**
 * Defines the structure for registering a Multi-Channel Platform (MCP) client
 * with the MCPClientService.
 *
 * @template ID - A unique string literal type for the client ID.
 * @template ConfigSchema - A Zod schema defining the configuration needed by the client.
 * @template ClientInstance - The type of the initialized client object returned by `initialize`.
 */
export interface MCPClient<
    // Use a specific string literal type for ID if known, otherwise string
    ID extends string = string,
    ConfigSchema extends z.ZodTypeAny = z.ZodTypeAny,
    ClientInstance = unknown,
> {
    /** A unique identifier for this client (e.g., "gmail", "hubspot"). */
    readonly id: ID;
    /** A human-readable name for the client (e.g., "Gmail API Client"). */
    readonly name: string;
    /** A brief description of what the client does or connects to. */
    readonly description: string;
    /** Optional tags for categorizing or filtering clients. */
    readonly tags?: ReadonlyArray<string>;
    /** The Zod schema used to validate the configuration object for this client. */
    readonly configSchema: ConfigSchema;
    /**
     * An Effectful function that takes the validated configuration and execution context,
     * performs necessary setup (like authentication), and returns the initialized client instance
     * or fails with a `ClientInitializationError`.
     *
     * @param config - The validated configuration object matching `configSchema`.
     * @param context - The execution context providing framework services.
     * @returns An Effect yielding the `ClientInstance` on success, or `ClientInitializationError` on failure.
     */
    readonly initialize: (
        config: z.output<ConfigSchema>, // Use z.output for the validated type
        context: MCPClientExecutionContext
    ) => Effect.Effect<ClientInstance, ClientInitializationError>;
}

/** Represents any MCPClient definition, used for registration and listing. */
export type AnyMCPClient = MCPClient<string, z.ZodTypeAny, unknown>;

/** Utility type to extract the initialized client instance type from an MCPClient definition. */
export type InitializedClient<T extends AnyMCPClient> = T extends MCPClient<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    infer Instance
>
    ? Instance
    : never;

// --- Service Interface ---

/**
 * Defines the contract for the MCPClientService.
 * Manages registration, configuration, initialization, and retrieval of MCP clients.
 */
export interface IMCPClientService {
    /**
     * Registers an MCP client definition with the service.
     * Fails if a client with the same ID is already registered.
     *
     * @param client - The MCPClient definition object.
     * @returns An Effect that completes successfully (`void`) or fails with `ClientRegistrationError`.
     */
    readonly registerClient: (
        client: AnyMCPClient
    ) => Effect.Effect<void, ClientRegistrationError>;

    /**
     * Retrieves, configures, and initializes an MCP client instance by its ID.
     * Handles fetching/validating configuration and running the client's `initialize` function.
     * Results may be cached internally.
     *
     * @template T - The specific type of the MCPClient definition being requested.
     * @param clientId - The unique ID of the client to retrieve.
     * @returns An Effect yielding the initialized client instance (`InitializedClient<T>`) on success,
     * or failing with `ClientNotFoundError`, `ClientConfigurationError`, or `ClientInitializationError`.
     */
    readonly getClient: <T extends AnyMCPClient>(
        clientId: T["id"]
    ) => Effect.Effect<
        InitializedClient<T>,
        | ClientNotFoundError
        | ClientConfigurationError
        | ClientInitializationError
    >;

    /**
     * Lists all registered MCP client definitions, optionally filtering by tags.
     *
     * @param options - Optional filtering criteria.
     * @param options.tags - An array of tags; clients matching any tag will be returned.
     * @returns An Effect yielding a readonly array of `AnyMCPClient` definitions. This effect cannot fail.
     */
    readonly listClients: (options?: {
        readonly tags?: ReadonlyArray<string>;
    }) => Effect.Effect<ReadonlyArray<AnyMCPClient>, never>;
}

// --- Service Tag ---

/**
 * Effect Tag for the MCPClientService. Use this to specify the service
 * as a dependency in Effect layers and access it from the context.
 */
export class MCPClientService extends Context.Tag(
    "MCPClientService" // Consider namespacing like "@app/MCPClientService" in larger projects
)<MCPClientService, IMCPClientService>() { }
