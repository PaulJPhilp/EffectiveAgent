import { Args, Command, Options, Prompt } from "@effect/cli"
import { Effect } from "effect"
import { join } from "path"
import * as Templates from "../boilerplate/templates.js"
import { FileSystemLayer, FileSystemOps } from "../services/fs.js"

// Command arguments
const initArgs = Args.text({ name: "project-name" })

// Command options
const initOptions = Options.all({
    useBun: Options.boolean("use-bun").pipe(
        Options.withDescription("Use Bun as the package manager (skips prompt)")
    ),
    useNpm: Options.boolean("use-npm").pipe(
        Options.withDescription("Use NPM as the package manager (skips prompt)")
    ),
    yes: Options.boolean("yes").pipe(
        Options.withAlias("y"),
        Options.withDescription("Skip all prompts and use defaults (Bun)")
    )
})

// Initialize project files
const initializeProjectFiles = (projectPath: string, projectName: string, packageManager: "npm" | "bun") =>
    Effect.gen(function* () {
        // Write configuration files
        yield* FileSystemOps.writeJson(
            join(projectPath, "ea-config/master-config.json"),
            Templates.masterConfigTemplate
        )
        yield* FileSystemOps.writeJson(
            join(projectPath, "ea-config/models.json"),
            Templates.modelsTemplate
        )
        yield* FileSystemOps.writeJson(
            join(projectPath, "ea-config/providers.json"),
            Templates.providersTemplate
        )
        yield* FileSystemOps.writeJson(
            join(projectPath, "ea-config/policy.json"),
            Templates.policyTemplate
        )
        yield* FileSystemOps.writeJson(
            join(projectPath, "ea-config/tool-registry.json"),
            Templates.toolRegistryTemplate
        )

        // Write project configuration files
        yield* FileSystemOps.writeJson(
            join(projectPath, "package.json"),
            Templates.createRootPackageJson(projectName, packageManager)
        )
        yield* FileSystemOps.writeJson(
            join(projectPath, "tsconfig.json"),
            Templates.tsConfigTemplate
        )
        yield* FileSystemOps.writeJson(
            join(projectPath, ".biomerc.json"),
            Templates.biomeTemplate
        )
    })

// Main command implementation
export const initCommand = Command.make("init", {
    args: initArgs,
    options: initOptions
}).pipe(Command.withHandler((args) =>
    Effect.gen(function* () {
        const projectName = args.args
        const projectPath = join(process.cwd(), projectName)
        const options = args.options

        // Check if directory exists
        const exists = yield* FileSystemOps.exists(projectPath)
        if (exists) {
            return yield* Effect.fail(`Directory ${projectName} already exists`)
        }

        // Determine package manager based on options
        let packageManager: "bun" | "npm"
        if (options.yes || options.useBun) {
            packageManager = "bun"
        } else if (options.useNpm) {
            packageManager = "npm"
        } else {
            // Prompt for package manager if no flags provided
            const packageManagerResult = yield* Prompt.select({
                message: "Select a package manager",
                choices: [
                    { value: "bun", title: "Bun (recommended)" },
                    { value: "npm", title: "NPM" }
                ]
            })
            packageManager = packageManagerResult as unknown as "bun" | "npm"
        }

        // Initialize project structure
        yield* FileSystemOps.initializeProject(projectPath)

        // Initialize project files
        yield* initializeProjectFiles(projectPath, projectName, packageManager)

        // Log success message instead of returning it
        yield* Effect.log(`✅ Project ${projectName} initialized successfully!\n\nNext steps:\n1. cd ${projectName}\n2. ${packageManager} install\n3. ea-cli add:agent my-first-agent`)
    }).pipe(Effect.provide(FileSystemLayer))
)) 