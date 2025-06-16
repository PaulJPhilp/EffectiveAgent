import { Args, Command } from "@effect/cli"
import { Effect } from "effect"
import { createAgent } from "../boilerplate/agent.js"
import {
  ConfigurationError,
  PermissionError,
  ResourceExistsError,
  ValidationError,
  mapUnknownError,
} from "../errors.js"
import { type ResourceType, addConfigItem } from "../utils/config-helpers.js"

// Validation utilities with improved error messages
const validateAgentName = (
  name: string,
): Effect.Effect<void, ValidationError> => {
  // Agent name should be valid package name
  if (!/^[a-z0-9-]+$/.test(name)) {
    return Effect.fail(
      new ValidationError({
        message:
          "Agent name can only contain lowercase letters, numbers, and hyphens.\nExample valid names: my-agent, agent-1, test-agent",
        field: "agent-name",
      }),
    )
  }
  if (name.length < 1 || name.length > 214) {
    return Effect.fail(
      new ValidationError({
        message:
          "Agent name must be between 1 and 214 characters.\nThis follows npm package name length restrictions.",
        field: "agent-name",
      }),
    )
  }
  return Effect.succeed(void 0)
}

const validateConfigItemName = (
  name: string,
  type: ResourceType,
): Effect.Effect<void, ValidationError> => {
  const patterns: Record<ResourceType, RegExp> = {
    model: /^[a-zA-Z0-9-]+$/,
    provider: /^[a-zA-Z0-9-]+$/,
    rule: /^[a-zA-Z0-9-_.]+$/,
    toolkit: /^[a-zA-Z0-9-]+$/,
  }

  if (!patterns[type].test(name)) {
    const examples = {
      model: "gpt-4, claude-2",
      provider: "openai, anthropic",
      rule: "max-tokens.50000, context.4k",
      toolkit: "search-tools, data-analysis",
    }
    return Effect.fail(
      new ValidationError({
        message: `Invalid ${type} name format. Use only letters, numbers, and allowed special characters.\nExample valid names: ${examples[type]}`,
        field: "item-name",
      }),
    )
  }
  return Effect.succeed(void 0)
}

const addAgentDesc =
  "Create a new agent in the agents/ directory. A new package will be " +
  "created with the necessary files and dependencies for agent development. " +
  "This includes package.json, tsconfig.json, and initial agent source files.\n\n" +
  "Recovery hints:\n" +
  "- If agent already exists, choose a different name or delete the existing one\n" +
  "- If permission denied, check write permissions in the agents/ directory\n" +
  "- If directory not found, run 'ea-cli init' first"

const addAgentCommand = Command.make(
  "agent",
  {
    agentName: Args.text({ name: "agent-name" }).pipe(
      Args.withDescription("The name of the new agent to create"),
    ),
  },
  ({ agentName }) =>
    Effect.gen(function* () {
      // Validate agent name
      yield* validateAgentName(agentName)

      // Create agent with Effect-based error handling
      yield* createAgent(agentName).pipe(
        Effect.catchAll((error) => {
          if (error instanceof Error) {
            if (error.message.includes("EEXIST")) {
              return Effect.fail(
                new ResourceExistsError({
                  resourceType: "agent",
                  resourceName: agentName,
                  message: `Agent '${agentName}' already exists. Use a different name or delete the existing agent.`,
                }),
              )
            }
            if (error.message.includes("EACCES")) {
              return Effect.fail(
                new PermissionError({
                  message:
                    "Permission denied creating agent directory.\nCheck that you have write permissions in the agents/ directory.",
                  path: `agents/${agentName}`,
                  operation: "create",
                  requiredPermission: "write",
                }),
              )
            }
            if (error.message.includes("ENOENT")) {
              return Effect.fail(
                new ConfigurationError({
                  message:
                    "Agents directory not found. Run 'ea-cli init' to create the project structure.",
                  configPath: "agents/",
                  errorType: "missing",
                }),
              )
            }
          }
          return Effect.fail(mapUnknownError(error))
        }),
      )
    }),
).pipe(Command.withDescription(addAgentDesc))

// Helper to create config item command with Effect-based error handling
const createAddCommand = (
  type: ResourceType,
): Command.Command<
  ResourceType,
  {
    readonly itemName: string; // Ensure this matches the args definition
  },
  ValidationError | ResourceExistsError | ConfigurationError | PermissionError,
  never // The handler returns Effect<void, E, R>, so success channel is void, which is effectively never for Command output unless specified
> => {
  const descriptions = {
    model:
      "Add a new model configuration to the project. This will create an entry in models.json " +
      "where you can configure model-specific settings like parameters and endpoints.\n\n" +
      "Recovery hints:\n" +
      "- If model exists, choose a different name or delete existing one\n" +
      "- If file not found, run 'ea-cli init' first\n" +
      "- If permission denied, check write access to ea-config/models.json",
    provider:
      "Add a new provider configuration to the project. This will create an entry in providers.json " +
      "where you can configure API keys and other provider settings.\n\n" +
      "Recovery hints:\n" +
      "- If provider exists, choose a different name or delete existing one\n" +
      "- If file not found, run 'ea-cli init' first\n" +
      "- If permission denied, check write access to ea-config/providers.json",
    rule:
      "Add a new rule configuration to the project. This will create an entry in policy.json " +
      "where you can define custom rules and policies for agent behavior.\n\n" +
      "Recovery hints:\n" +
      "- If rule exists, choose a different name or delete existing one\n" +
      "- If file not found, run 'ea-cli init' first\n" +
      "- If permission denied, check write access to ea-config/policy.json",
    toolkit:
      "Add a new toolkit configuration to the project. This will create an entry in tool-registry.json " +
      "where you can define a collection of tools that agents can use.\n\n" +
      "Recovery hints:\n" +
      "- If toolkit exists, choose a different name or delete existing one\n" +
      "- If file not found, run 'ea-cli init' first\n" +
      "- If permission denied, check write access to ea-config/tool-registry.json",
  }

  const desc = descriptions[type]

  return Command.make(
    type,
    {
      itemName: Args.text({ name: "item-name" }).pipe(
        Args.withDescription(`Name/ID for the new ${type}`),
      ),
    },
    ({ itemName }) =>
      Effect.gen(function* () {
        // Validate config item name
        yield* validateConfigItemName(itemName, type)

        // Add config item with Effect-based error handling
        yield* addConfigItem(type, itemName, { placeholder: true }).pipe(
          Effect.catchAll((error: unknown) => { // Catch error as unknown
            if (error instanceof ResourceExistsError || error instanceof ConfigurationError || error instanceof PermissionError || error instanceof ValidationError) {
              return Effect.fail(error);
            }
            if (error instanceof Error) {
              if (error.message.includes("ENOENT")) {
                return Effect.fail(
                  new ConfigurationError({
                    message: `${type} configuration file not found.\nRun 'ea-cli init' to create required configuration files.`,
                    configPath: `ea-config/${type}s.json`,
                    errorType: "missing",
                  }),
                )
              }
              if (error.message.includes("EACCES")) {
                return Effect.fail(
                  new PermissionError({
                    message: `Permission denied updating ${type} configuration.\nCheck that you have write permissions for ea-config/${type}s.json`,
                    path: `ea-config/${type}s.json`,
                    operation: "write",
                    requiredPermission: "write",
                  }),
                )
              }
              if (error.message.includes("exists")) {
                return Effect.fail(
                  new ResourceExistsError({
                    resourceType: type,
                    resourceName: itemName,
                    message: `${type} '${itemName}' already exists. Choose a different name or delete the existing one.`,
                  }),
                )
              }
              if (error.message.includes("JSON")) {
                return Effect.fail(
                  new ConfigurationError({
                    message: `Invalid JSON in ${type} configuration.\nCheck the file format and fix any syntax errors.`,
                    configPath: `ea-config/${type}s.json`,
                    errorType: "parse",
                    cause: error,
                  }),
                )
              }
            }
            return Effect.fail(mapUnknownError(error))
          }),
        )
      }),
  ).pipe(Command.withDescription(desc))
}

// Create subcommands for adding different resource types
const resourceTypes = ["model", "provider", "rule", "toolkit"] as const
const configCommands = resourceTypes.map((type) => createAddCommand(type))

const addDesc =
  "Add new resources to the project.\n\n" +
  "Available Resources:\n" +
  "  agent       Create a new agent package in the agents/ directory\n" +
  "  model       Add a model configuration to models.json\n" +
  "  provider    Add a provider configuration to providers.json\n" +
  "  rule        Add a rule configuration to policy.json\n" +
  "  toolkit     Add a toolkit configuration to tool-registry.json\n\n" +
  "Usage:\n" +
  "  ea-cli add:agent my-new-agent\n" +
  "  ea-cli add:model gpt-4\n" +
  "  ea-cli add:provider openai\n\n" +
  "Resource configurations will be added with placeholder values that\n" +
  "you can then customize in their respective config files."

export const addCommand = Command.make("add", {}).pipe(
  Command.withDescription(addDesc),
  Command.withSubcommands([addAgentCommand, ...configCommands]),
)
