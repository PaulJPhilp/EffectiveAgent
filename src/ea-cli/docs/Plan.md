## `ea-cli` v1.0 Implementation Plan

### Phase 1: Project Setup & Core Dependencies

*   [x] Initialize a new Node.js project with `bun init`.
*   [x] Install core dependencies: `effect`, `@effect/cli`, `@effect/platform-node`.
*   [x] Install development dependencies: `typescript`, `ts-node`, `biome`, `@types/node`.
*   [x] Create `tsconfig.json` configured for a modern Node.js project (ESNext module system).
*   [x] Create `.biomerc` to enforce formatting standards (print width: 80).
*   [x] Create the main entrypoint file: `src/index.ts`.
*   [x] Set up the basic CLI structure in `src/index.ts` with a top-level `ea-cli` command and a placeholder for subcommands.

### Phase 2: Project Lifecycle Commands (`init`)

*   [x] **`init` Command:**
    *   [x] Define the `init` command structure in `src/index.ts`.
    *   [x] Implement the interactive prompt for package manager selection using `Prompts.select`.
    *   [x] Implement the file system logic to create the root workspace directory.
    *   [x] Implement the logic to create the `agents/` and `ea-config/` subdirectories.
    *   [x] Create a `Boilerplate` module/object to hold the template content for all default configuration files (`master-config.json`, `models.json`, etc.).
    *   [x] Implement the logic to write all default `ea-config/*.json` files using the boilerplate templates.
    *   [x] Implement the logic to write the root `package.json` file, configured for workspaces based on the selected package manager.
    *   [x] Add clear success and "Next steps" messages to the console output.
    *   [x] Add robust error handling (e.g., for when the target directory already exists).

### Phase 3: Resource Management (`add`, `list`, `delete`)

*   [x] **`add:agent` Command:**
    *   [x] Define the `add:agent` subcommand.
    *   [x] Create a `Boilerplate` module/object for the self-contained agent package files (`package.json`, `vitest.config.ts`, placeholder `.ts` files, etc.).
    *   [x] Implement the logic to create the `agents/<agent-name>` directory and all necessary subdirectories (`__tests__`, `agent/`, etc.).
    *   [x] Implement the logic to write all the agent package files from the boilerplate.
    *   [x] Add robust error handling (e.g., for when the agent package already exists).

*   [x] **Generic Config Handlers:**
    *   [x] Create a `Config` object to act as a single source of truth for the paths and keys of all configuration-based resources (`model`, `provider`, `rule`, `toolkit`).
    *   [x] Implement a generic `listConfigItems` function that can read any config file and list its contents.
    *   [x] Implement a generic `deleteConfigItem` function that can remove an entry from any config file, including a confirmation prompt.

*   [x] **Wire Up Resource Commands:**
    *   [x] Define the `add`, `list`, and `delete` subcommand groups.
    *   [x] For each resource (`model`, `provider`, `rule`, `toolkit`):
        *   [x] Create the `list:<resource>` command and wire it to the `listConfigItems` handler.
        *   [x] Create the `delete:<resource>` command and wire it to the `deleteConfigItem` handler.
        *   [x] Create the `add:<resource>` command with logic to add a placeholder entry to the correct config file.
    *   [x] Define and implement the `list:agent` command (directory listing).
    *   [x] Define and implement the `delete:agent` command (recursive directory deletion with confirmation).

### Phase 4: Execution & Operations

*   [x] **`config:validate` Command:**
    *   [x] Define the `config:validate` command.
    *   [x] Implement the handler to call the (mocked) `validateProjectConfig` function from the framework.
    *   [x] Implement the logic to render the success or formatted error list.

*   [x] **`log` Commands:**
    *   [x] Define the `log` subcommand group.
    *   [x] Implement a helper function to read the log file path from `master-config.json`.
    *   [x] Implement the `log:view` command, including logic for `--head` and `--tail` flags.
    *   [x] Implement the `log:clear` command, including a confirmation prompt.

*   [x] **`run` Command:**
    *   [x] Define the `run` command with its arguments and options.
    *   [x] Implement the handler to perform validation checks (agent exists, config exists).
    *   [x] Implement the call to the (mocked) `runAgent` framework function.
    *   [x] Implement the logic to consume the returned event stream and render formatted output to the console based on the event `type`.

*   [x] **`serve` Command:**
    *   [x] Define the `serve` command with its arguments and options.
    *   [x] Implement the handler to perform validation checks.
    *   [x] Implement the call to the (mocked) `serveAgent` framework function.
    *   [x] Implement the logic to consume the returned server status stream and render operational logs to the console.

### Phase 5: Finalization & Polish

*   [ ] **Help System:**
    *   [ ] Review all command and option definitions to ensure they have clear, descriptive text using `Command.withDescription`.
    *   [ ] Manually test the help output for all commands (`ea-cli --help`, `ea-cli add --help`, etc.) to ensure it is correct and helpful.
*   [ ] **Error Handling:**
    *   [ ] Perform a full review of the CLI, testing edge cases and error conditions.
    *   [ ] Ensure all errors are caught and presented to the user as clean, human-readable messages, avoiding raw stack traces.
*   [ ] **Code Cleanup:**
    *   [ ] Run `biome` on the entire codebase.
    *   [ ] Review the code for any remaining placeholders or `TODO` comments.
    *   [ ] Finalize the `package.json` with the correct name, version (1.0.0), and scripts.

---

This checklist provides a clear path from an empty directory to a fully-featured v1.0 CLI. We can now proceed step-by-step, ticking off each item as it's completed.