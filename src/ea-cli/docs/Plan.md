## `ea-cli` v1.0 Implementation Plan

### Phase 1: Project Setup & Core Dependencies ✅ COMPLETED

*   [x] Initialize a new Node.js project with `bun init`
*   [x] Install core dependencies: `effect`, `@effect/cli`, `@effect/platform-node`
*   [x] Install development dependencies: `typescript`, `ts-node`, `biome`, `@types/node`
*   [x] Create `tsconfig.json` configured for a modern Node.js project (ESNext module system)
*   [x] Create `.biomerc` to enforce formatting standards (print width: 80)
*   [x] Create the main entrypoint file: `src/index.ts`
*   [x] Set up the basic CLI structure in `src/index.ts` with a top-level `ea-cli` command and placeholder subcommands

### Phase 2: Project Lifecycle Commands ✅ COMPLETED

*   [x] **`init` Command:**
    *   [x] Define the `init` command structure in `src/index.ts`
    *   [x] Implement the interactive prompt for package manager selection using `Prompts.select`
    *   [x] Implement the file system logic to create the root workspace directory
    *   [x] Implement the logic to create the `agents/` and `ea-config/` subdirectories
    *   [x] Create a `Boilerplate` module/object to hold the template content for all default configuration files
    *   [x] Implement the logic to write all default `ea-config/*.json` files using the boilerplate templates
    *   [x] Implement the logic to write the root `package.json` file, configured for workspaces based on the selected package manager
    *   [x] Add clear success and "Next steps" messages to the console output
    *   [x] Add robust error handling for existing directories and invalid names
    *   [x] Add tests for happy path and error cases

### Phase 3: Resource Management ✅ COMPLETED

*   [x] **`add:agent` Command:**
    *   [x] Define the `add:agent` subcommand
    *   [x] Create a `Boilerplate` module for the agent package files
    *   [x] Implement the logic to create the `agents/<agent-name>` directory and subdirectories
    *   [x] Implement the logic to write all the agent package files from the boilerplate
    *   [x] Add robust error handling

*   [x] **Generic Config Handlers:**
    *   [x] Create a `Config` object for configuration-based resources paths and keys
    *   [x] Implement a generic `listConfigItems` function for reading and listing config files
    *   [x] Implement a generic `deleteConfigItem` function for removing config entries
    *   [x] Implement a generic `addConfigItem` function for adding new entries

*   [x] **Wire Up Resource Commands:**
    *   [x] Define the `add`, `list`, and `delete` subcommand groups
    *   [x] For each resource (`model`, `provider`, `rule`, `toolkit`):
        *   [x] Create and wire up `list:<resource>` command
        *   [x] Create and wire up `delete:<resource>` command
        *   [x] Create and wire up `add:<resource>` command
    *   [x] Implement `list:agent` command for directory listing
    *   [x] Implement `delete:agent` command with directory deletion and confirmation

### Phase 4: Execution & Operations 🚧 IN PROGRESS

*   [x] **`config:validate` Command:**
    *   [x] Define the command structure
    *   [x] Implement handler for framework validation
    *   [x] Implement success/error rendering

*   [x] **`log` Commands:**
    *   [x] Define the `log` subcommand group
    *   [x] Implement log file path reader from config
    *   [x] Implement `log:view` with `--head` and `--tail` options
    *   [x] Implement `log:clear` with confirmation

*   [✓] **`run` Command:**
    *   [x] Define command with arguments and options
    *   [x] Implement agent and config validation
    *   [x] Implement framework integration
    *   [x] Implement event stream rendering
    *   [x] Add Effect.js idiomatic error handling

*   [ ] **`serve` Command:**
    *   [x] Define command structure
    *   [x] Implement validation checks
    *   [ ] Implement framework integration
    *   [ ] Implement server status stream handling
    *   [ ] Add robust error handling for server issues

### Phase 5: Finalization & Polish ⏳ PENDING

*   [ ] **Help System:**
    *   [ ] Review all command and option descriptions
    *   [ ] Test help output for all commands
    *   [ ] Ensure clear and helpful messages

*   [ ] **Error Handling:**
    *   [ ] Full review of edge cases
    *   [ ] Clean error message formatting
    *   [ ] Remove raw stack traces

*   [ ] **Code Cleanup:**
    *   [ ] Run formatter on entire codebase
    *   [ ] Review for TODOs and placeholders
    *   [ ] Finalize package.json metadata

---

Next steps are focused on completing Phase 4, specifically:
1. Completing the `serve` command functionality
2. Testing WebSocket server integration
3. Finalizing error handling for server operations