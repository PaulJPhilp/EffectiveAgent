import { Command } from "@effect/cli"
import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { spawn } from "child_process"
import { Effect } from "effect"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { initCommand } from "../init.js"

describe("init command", () => {
    const TEST_DIR = join(process.cwd(), "test-workspace")
    const PROJECT_NAME = "test-project"
    const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)

    // Set up test workspace before each test
    beforeEach(async () => {
        const fs = await Effect.runPromise(
            Effect.gen(function* () {
                return yield* FileSystem.FileSystem
            }).pipe(Effect.provide(NodeContext.layer))
        )

        // Create test directory
        await Effect.runPromise(
            fs.makeDirectory(TEST_DIR).pipe(Effect.provide(NodeContext.layer))
        )

        // Change to test directory
        // process.chdir(TEST_DIR)
    })

    // Clean up after each test
    afterEach(async () => {
        const fs = await Effect.runPromise(
            Effect.gen(function* () {
                return yield* FileSystem.FileSystem
            }).pipe(Effect.provide(NodeContext.layer))
        )

        // Remove test directory recursively
        await Effect.runPromise(
            fs.remove(TEST_DIR, { recursive: true })
                .pipe(Effect.provide(NodeContext.layer))
        )
    })

    // Helper to run the CLI as a subprocess
    function runCli(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; code: number }> {
        // Use correct absolute path to CLI entrypoint (src/ea-cli/src/index.ts)
        const cliPath = join(__dirname, "../../index.ts")
        return new Promise((resolve) => {
            const proc = spawn("bun", ["run", cliPath, ...args], {
                cwd: cwd || process.cwd(),
                env: { ...process.env },
                stdio: ["ignore", "pipe", "pipe"]
            })
            let stdout = ""
            let stderr = ""
            proc.stdout.on("data", (data) => { stdout += data })
            proc.stderr.on("data", (data) => { stderr += data })
            proc.on("close", (code) => {
                resolve({ stdout, stderr, code: code ?? 0 })
            })
        })
    }

    it("should create a complete and valid workspace", async () => {
        // Run init command as a subprocess
        const { stdout, stderr, code } = await runCli(["init", "--yes", PROJECT_NAME], TEST_DIR)
        // Debug output
        // eslint-disable-next-line no-console
        console.log("CLI stdout:", stdout)
        console.log("CLI stderr:", stderr)
        expect(code).toBe(0)

        // Get FileSystem
        const fs = await Effect.runPromise(
            Effect.gen(function* () {
                return yield* FileSystem.FileSystem
            }).pipe(Effect.provide(NodeContext.layer))
        )

        // Verify directory structure
        const projectExists = await Effect.runPromise(fs.exists(PROJECT_PATH).pipe(Effect.provide(NodeContext.layer)))
        expect(projectExists).toBe(true)

        const configExists = await Effect.runPromise(fs.exists(join(PROJECT_PATH, "ea-config")).pipe(Effect.provide(NodeContext.layer)))
        expect(configExists).toBe(true)

        const agentsExists = await Effect.runPromise(fs.exists(join(PROJECT_PATH, "agents")).pipe(Effect.provide(NodeContext.layer)))
        expect(agentsExists).toBe(true)

        const logsExists = await Effect.runPromise(fs.exists(join(PROJECT_PATH, "logs")).pipe(Effect.provide(NodeContext.layer)))
        expect(logsExists).toBe(true)

        // Verify configuration files
        const configFiles = [
            "master-config.json",
            "models.json",
            "providers.json",
            "policy.json",
            "tool-registry.json"
        ]

        for (const file of configFiles) {
            const exists = await Effect.runPromise(fs.exists(join(PROJECT_PATH, "ea-config", file)).pipe(Effect.provide(NodeContext.layer)))
            expect(exists).toBe(true)

            const content = await Effect.runPromise(fs.readFileString(join(PROJECT_PATH, "ea-config", file)).pipe(Effect.provide(NodeContext.layer)))
            expect(() => JSON.parse(content)).not.toThrow()
        }

        // Verify project files
        const projectFiles = [
            "package.json",
            "tsconfig.json",
            ".biomerc.json"
        ]

        for (const file of projectFiles) {
            const exists = await Effect.runPromise(fs.exists(join(PROJECT_PATH, file)).pipe(Effect.provide(NodeContext.layer)))
            expect(exists).toBe(true)

            const content = await Effect.runPromise(fs.readFileString(join(PROJECT_PATH, file)).pipe(Effect.provide(NodeContext.layer)))
            expect(() => JSON.parse(content)).not.toThrow()
        }

        // Verify package.json content
        const packageJson = JSON.parse(
            await Effect.runPromise(fs.readFileString(join(PROJECT_PATH, "package.json")).pipe(Effect.provide(NodeContext.layer)))
        )
        expect(packageJson.name).toBe(PROJECT_NAME)
        expect(packageJson.workspaces).toContain("agents/*")
        expect(packageJson.dependencies.effect).toBeDefined()
        expect(packageJson.devDependencies["@biomejs/biome"]).toBeDefined()
    })

    it("should fail if project directory already exists", async () => {
        // Create project directory first
        const fs = await Effect.runPromise(
            Effect.gen(function* () {
                return yield* FileSystem.FileSystem
            }).pipe(Effect.provide(NodeContext.layer))
        )

        await Effect.runPromise(
            fs.makeDirectory(PROJECT_PATH).pipe(Effect.provide(NodeContext.layer))
        )

        // Run init command and expect failure
        try {
            await Effect.runPromise(
                Command.run(initCommand, {
                    name: "init",
                    version: "1.0.0"
                })([PROJECT_NAME]).pipe(
                    Effect.provide(NodeContext.layer)
                )
            )
            throw new Error("Expected command to fail but it succeeded")
        } catch (error) {
            // Command failed as expected
            expect(error).toBeDefined()
        }
    })
})