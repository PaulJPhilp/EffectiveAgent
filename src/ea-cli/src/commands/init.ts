import { Args, Command, Options } from "@effect/cli"
import { Effect } from "effect"
import { join } from "node:path"
import * as Templates from "../boilerplate/templates.js"
import {
    FileSystemError,
    ResourceExistsError,
    ValidationError,
    isRetryableError,
    mapUnknownError,
} from "../errors.js"
import {
    FileSystemLayer,
    createDir,
    exists as pathExists,
    writeJson,
} from "../services/fs.js"

// Validation utilities
const validateProjectName = (
    name: string,
): Effect.Effect<void, ValidationError> => {
    // Project name should be valid npm package name (lowercase letters, numbers, hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
        return Effect.fail(
            new ValidationError({
                message:
                    "Project name can only contain lowercase letters, numbers, and hyphens",
                field: "project-name",
            }),
        )
    }
    if (name.length < 1 || name.length > 214) {
        return Effect.fail(
            new ValidationError({
                message: "Project name must be between 1 and 214 characters",
                field: "project-name",
            }),
        )
    }
    return Effect.succeed(void 0)
}

// Initialize project files with proper Effect error handling
const initializeProjectFiles = (
    projectPath: string,
    projectName: string,
    packageManager: "npm" | "bun",
) =>
    Effect.gen(function* () {
        // Write configuration files with improved error messages and recovery hints
        const configFiles = [
            {
                path: join(projectPath, "ea-config/master-config.json"),
                content: Templates.masterConfigTemplate,
                desc: "master configuration",
            },
            {
                path: join(projectPath, "ea-config/models.json"),
                content: Templates.modelsTemplate,
                desc: "models configuration",
            },
            {
                path: join(projectPath, "ea-config/providers.json"),
                content: Templates.providersTemplate,
                desc: "providers configuration",
            },
            {
                path: join(projectPath, "ea-config/policy.json"),
                content: Templates.policyTemplate,
                desc: "policy configuration",
            },
            {
                path: join(projectPath, "ea-config/tool-registry.json"),
                content: Templates.toolRegistryTemplate,
                desc: "tool registry configuration",
            },
        ]

        // Write each config file with proper error handling
        yield* Effect.forEach(configFiles, (file) =>
            writeJson(file.path, file.content).pipe(
                Effect.mapError(
                    (err) =>
                        new FileSystemError({
                            message: `Failed to write ${file.desc} file. Make sure you have write permissions and sufficient disk space.`,
                            path: file.path,
                            operation: "write",
                            cause: err,
                        }),
                ),
            ),
        )

        // Write project files with improved error handling
        const projectFiles = [
            {
                path: join(projectPath, "package.json"),
                content: Templates.createRootPackageJson(projectName, packageManager),
                desc: "package.json",
            },
            {
                path: join(projectPath, "tsconfig.json"),
                content: Templates.tsConfigTemplate,
                desc: "TypeScript configuration",
            },
            {
                path: join(projectPath, ".biomerc.json"),
                content: Templates.biomeTemplate,
                desc: "Biome configuration",
            },
        ]

        // Write each project file with proper error handling
        yield* Effect.forEach(projectFiles, (file) =>
            writeJson(file.path, file.content).pipe(
                Effect.mapError(
                    (err) =>
                        new FileSystemError({
                            message: `Failed to write ${file.desc} file. Make sure you have write permissions and sufficient disk space.`,
                            path: file.path,
                            operation: "write",
                            cause: err,
                        }),
                ),
            ),
        ).pipe(
            Effect.catchAll((err) =>
                Effect.fail(
                    new FileSystemError({
                        message:
                            "Failed to initialize project files. Please ensure you have:\n" +
                            "1. Write permissions in the target directory\n" +
                            "2. Sufficient disk space\n" +
                            "3. No conflicting files/directories",
                        path: projectPath,
                        operation: "initialization",
                        cause: err,
                    }),
                ),
            ),
        )
    })

// Handler function that can be tested independently
export const initProjectHandler = (args: { projectName: string; yes: boolean }) =>
    Effect.gen(function* () {
        const { projectName, yes } = args

        // Validate project name
        yield* validateProjectName(projectName)

        const projectPath = join(process.cwd(), projectName)

        // Check if directory exists with improved error handling
        yield* pathExists(projectPath).pipe(
            Effect.mapError(
                (err) =>
                    new FileSystemError({
                        message: "Failed to check if project directory exists",
                        path: projectPath,
                        operation: "exists",
                        cause: err,
                    }),
            ),
            Effect.flatMap((exists) =>
                exists
                    ? Effect.fail(
                        new ResourceExistsError({
                            resourceType: "directory",
                            resourceName: projectName,
                            message: `A directory named '${projectName}' already exists. Please choose a different name or remove the existing directory.`,
                        }),
                    )
                    : Effect.succeed(undefined),
            ),
        )

        // Always use bun as the package manager
        const packageManager = "bun"

        // Initialize project structure with error handling
        yield* Effect.gen(function* () {
            yield* createDir(projectPath)
            yield* createDir(join(projectPath, "ea-config"))
            yield* createDir(join(projectPath, "agents"))
            yield* createDir(join(projectPath, "logs"))
        }).pipe(
            Effect.mapError(
                (err) =>
                    new FileSystemError({
                        message: "Failed to initialize project structure",
                        path: projectPath,
                        operation: "initialization",
                        cause: err,
                    }),
            ),
        )

        // Initialize project files with retry for transient errors
        yield* Effect.retry(
            initializeProjectFiles(projectPath, projectName, packageManager),
            {
                times: 3,
                while: (err) => isRetryableError(mapUnknownError(err)),
            },
        )

        // Log success message
        yield* Effect.log(
            `✅ Project ${projectName} initialized successfully!\n\nNext steps:\n1. cd ${projectName}\n2. ${packageManager} install\n3. ea-cli add:agent my-first-agent`,
        )
    }).pipe(Effect.provide(FileSystemLayer))

// Main command implementation with proper CLI argument handling
export const initCommand = Command.make(
    "init",
    {
        projectName: Args.text({ name: "project-name" }).pipe(
            Args.withDescription("The name of the new project to create"),
        ),
        yes: Options.boolean("yes", { aliases: ["y"] }).pipe(
            Options.withDescription("Skip confirmation prompts and use defaults"),
        ),
    },
    initProjectHandler,
).pipe(
    Command.withDescription(
        "Initialize a new Effective Agent project workspace.\n\n" +
        "This command will:\n" +
        "  1. Create a new directory with the specified project name\n" +
        "  2. Set up the required directory structure (agents/, ea-config/)\n" +
        "  3. Generate default configuration files with valid schemas\n" +
        "  4. Initialize package management (npm or bun)\n\n" +
        "Options:\n" +
        "  --yes (-y)    Skip prompts and use defaults\n\n" +
        "Example: ea-cli init my-agent-project",
    ),
)
