

## `ea-cli` v1.0 Implementation Plan

### Phase 1: Project Setup & Core Dependencies

*   [ ] Initialize a new Node.js project with `bun init`.
*   [ ] Install core dependencies: `effect`, `@effect/cli`, `@effect/platform-node`.
*   [ ] Install development dependencies: `typescript`, `ts-node`, `biome`, `@types/node`.
*   [ ] Create `tsconfig.json` configured for a modern Node.js project (ESNext module system).
*   [ ] Create `.biomerc` to enforce formatting standards (print width: 80).
*   [ ] Create the main entrypoint file: `src/index.ts`.
*   [ ] Set up the basic CLI structure in `src/index.ts` with a top-level `ea-cli` command and a placeholder for subcommands.

### Phase 2: Project Lifecycle Commands (`init`)

*   [ ] **`init` Command:**
    *   [ ] Define the `init` command structure in `src/index.ts`.
    *   [ ] Implement the interactive prompt for package manager selection using `Prompts.select`.
    *   [ ] Implement the file system logic to create the root workspace directory.
    *   [ ] Implement the logic to create the `agents/` and `ea-config/` subdirectories.
    *   [ ] Create a `Boilerplate` module/object to hold the template content for all default configuration files (`master-config.json`, `models.json`, etc.).
    *   [ ] Implement the logic to write all default `ea-config/*.json` files using the boilerplate templates.
    *   [ ] Implement the logic to write the root `package.json` file, configured for workspaces based on the selected package manager.
    *   [ ] Add clear success and "Next steps" messages to the console output.
    *   [ ] Add robust error handling (e.g., for when the target directory already exists).

### Phase 3: Resource Management (`add`, `list`, `delete`)

*   [ ] **`add:agent` Command:**
    *   [ ] Define the `add:agent` subcommand.
    *   [ ] Create a `Boilerplate` module/object for the self-contained agent package files (`package.json`, `vitest.config.ts`, placeholder `.ts` files, etc.).
    *   [ ] Implement the logic to create the `agents/<agent-name>` directory and all necessary subdirectories (`__tests__`, `agent/`, etc.).
    *   [ ] Implement the logic to write all the agent package files from the boilerplate.
    *   [ ] Add robust error handling (e.g., for when the agent package already exists).

*   [ ] **Generic Config Handlers:**
    *   [ ] Create a `Config` object to act as a single source of truth for the paths and keys of all configuration-based resources (`model`, `provider`, `rule`, `toolkit`).
    *   [ ] Implement a generic `listConfigItems` function that can read any config file and list its contents.
    *   [ ] Implement a generic `deleteConfigItem` function that can remove an entry from any config file, including a confirmation prompt.

*   [ ] **Wire Up Resource Commands:**
    *   [ ] Define the `add`, `list`, and `delete` subcommand groups.
    *   [ ] For each resource (`model`, `provider`, `rule`, `toolkit`):
        *   [ ] Create the `list:<resource>` command and wire it to the `listConfigItems` handler.
        *   [ ] Create the `delete:<resource>` command and wire it to the `deleteConfigItem` handler.
        *   [ ] Create the `add:<resource>` command with logic to add a placeholder entry to the correct config file.
    *   [ ] Define and implement the `list:agent` command (directory listing).
    *   [ ] Define and implement the `delete:agent` command (recursive directory deletion with confirmation).

### Phase 4: Execution & Operations

*   [ ] **`config:validate` Command:**
    *   [ ] Define the `config:validate` command.
    *   [ ] Implement the handler to call the (mocked) `validateProjectConfig` function from the framework.
    *   [ ] Implement the logic to render the success or formatted error list.

*   [ ] **`log` Commands:**
    *   [ ] Define the `log` subcommand group.
    *   [ ] Implement a helper function to read the log file path from `master-config.json`.
    *   [ ] Implement the `log:view` command, including logic for `--head` and `--tail` flags.
    *   [ ] Implement the `log:clear` command, including a confirmation prompt.

*   [ ] **`run` Command:**
    *   [ ] Define the `run` command with its arguments and options.
    *   [ ] Implement the handler to perform validation checks (agent exists, config exists).
    *   [ ] Implement the call to the (mocked) `runAgent` framework function.
    *   [ ] Implement the logic to consume the returned event stream and render formatted output to the console based on the event `type`.

*   [ ] **`serve` Command:**
    *   [ ] Define the `serve` command with its arguments and options.
    *   [ ] Implement the handler to perform validation checks.
    *   [ ] Implement the call to the (mocked) `serveAgent` framework function.
    *   [ ] Implement the logic to consume the returned server status stream and render operational logs to the console.

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