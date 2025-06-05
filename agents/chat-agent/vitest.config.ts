/**
 * Vitest configuration for Chat Agent tests
 */

import path from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: [],
        coverage: {
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "dist/",
                "**/*.test.ts",
                "**/*.config.ts"
            ]
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "../../src")
        }
    }
}) 