// This file is required by vitest to setup the test environment
import * as NodePath from "node:path";
import * as NodeFs from "node:fs/promises";

// Test configuration
const TEST_LOG_DIR = NodePath.join(process.cwd(), "test-logs");

// Create test log directory if it doesn't exist
export const setup = async () => {
    try {
        await NodeFs.mkdir(TEST_LOG_DIR, { recursive: true });
    } catch (error) {
        console.error("Failed to create test log directory:", error);
    }
};

setup();
