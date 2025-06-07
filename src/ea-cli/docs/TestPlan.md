

## `ea-cli` v1.0 Test Plan (Integration-Focused)

### 1. Testing Philosophy & Tools

*   **Test Runner:** `vitest`
*   **Core Principle:** Test the CLI as a complete program. We will execute commands and verify their real-world side effects. Tests will be isolated by performing all operations within temporary directories that are created before each test and destroyed after.
*   **Strategy:**
    *   **File System:** All tests will operate on the **real file system** inside a temporary directory created for the test. We will use Node.js's `fs` and `path` modules in our test assertions to inspect the results.
    *   **User Prompts:** For commands requiring confirmation (like `delete`), we will execute the CLI as a **child process** and pipe the required input (e.g., `"y\n"`) to its `stdin`.
    *   **Framework API:** We will not mock the framework's functions. Instead, we will create a simple, runnable **"Fake Framework" script**. The CLI will be temporarily configured to call this script. This tests the CLI's ability to correctly spawn a process and handle its `stdout`, `stderr`, and exit codes.

### 2. Test Setup (Test Harness)

*   A `test-setup.ts` file will contain helper functions:
    *   `createTestWorkspace()`: Creates a unique temporary directory for a test run.
    *   `cleanupTestWorkspace()`: Deletes the temporary directory.
    *   `runCli(args: string[], stdin?: string)`: A function that executes the CLI programmatically or as a child process, capturing its `stdout`, `stderr`, and exit code.
    *   `createFakeFrameworkScript()`: Generates a simple Node.js script on the fly that mimics the behavior of the real framework API for testing the `run` and `serve` commands.

### 3. Test Cases Checklist

#### Phase 1: Project & Agent Lifecycle

*   **`ea-cli init`**
    *   [ ] `it("should create a complete and valid workspace on the file system")`
        *   **Setup:** Create an empty temporary directory.
        *   **Action:** Run `runCli(['init', 'my-test-project'], 'npm\n')`.
        *   **Assertion:** Use `fs.existsSync` and `fs.readFileSync` to verify that the `my-test-project` directory, its subdirectories (`ea-config`, `agents`), and all the default JSON files were created correctly and contain valid content.

*   **`ea-cli add:agent`**
    *   [ ] `it("should create a complete agent package directory inside an existing workspace")`
        *   **Setup:** Run the `init` logic to create a workspace.
        *   **Action:** Run `runCli(['add:agent', 'my-new-agent'])` from within the workspace directory.
        *   **Assertion:** Use `fs` to verify that the `agents/my-new-agent` directory and its complete file structure exist and are correct.

#### Phase 2: Resource & Log Management

*   **`ea-cli list:*`**
    *   [ ] `it("should correctly list agents by reading the agents/ directory")`
        *   **Setup:** Create a test workspace and manually create directories: `agents/agent-one`, `agents/agent-two`.
        *   **Action:** Run `runCli(['list:agent'])`.
        *   **Assertion:** Assert that the captured `stdout` contains "agent-one" and "agent-two".

*   **`ea-cli delete:agent`**
    *   [ ] `it("should delete an agent directory from the file system after confirmation")`
        *   **Setup:** Create a test workspace with an agent at `agents/agent-to-delete`.
        *   **Action:** Run `runCli(['delete:agent', 'agent-to-delete'], 'y\n')`.
        *   **Assertion:** Use `fs.existsSync` to verify that the `agents/agent-to-delete` directory no longer exists.

*   **`ea-cli log:view`**
    *   [ ] `it("should print the contents of the actual log file")`
        *   **Setup:** Create a test workspace. Manually write a log file to the path specified in the default `master-config.json`.
        *   **Action:** Run `runCli(['log:view'])`.
        *   **Assertion:** Assert that the captured `stdout` exactly matches the content of the log file you created.

#### Phase 3: Execution Commands

*   **`ea-cli config:validate`**
    *   [ ] `it("should call the fake framework script and print its success message")`
        *   **Setup:** Create a test workspace. Create a `fake-framework.js` that prints a success JSON object. Configure the CLI to call this script.
        *   **Action:** Run `runCli(['config:validate'])`.
        *   **Assertion:** Assert that `stdout` contains the formatted success message (e.g., "✅ Configuration files are valid.").

*   **`ea-cli run`**
    *   [ ] `it("should call the fake framework script and correctly format its streaming output")`
        *   **Setup:** Create a test workspace. Create a `fake-framework.js` that, when run, prints a series of `AgentEvent` JSON objects to its `stdout`, one per line.
        *   **Action:** Run `runCli(['run', 'my-agent', '--input', 'test'])`.
        *   **Assertion:** Assert that the captured `stdout` from the CLI is the correctly *formatted, human-readable version* of the JSON output from the fake script. This verifies the CLI's rendering logic.
    *   [ ] `it("should exit with an error if the fake framework script returns a non-zero exit code")`
        *   **Setup:** Create a `fake-framework.js` that immediately exits with code 1 and prints an error to `stderr`.
        *   **Action:** Run `runCli(['run', 'my-agent'])`.
        *   **Assertion:** Assert that the CLI process also exits with a non-zero code and that its `stderr` contains the error from the fake script.

This integration-focused test plan provides a much higher degree of confidence. It ensures the CLI works with real processes and a real file system, which directly addresses your valid concerns about the brittleness of mocks.