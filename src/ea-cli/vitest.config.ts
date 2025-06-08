import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        testTimeout: 30000,
    },
    resolve: {
        alias: {
            "@": new URL("../src", import.meta.url).pathname,
            "@/agent-runtime": new URL("../src/agent-runtime", import.meta.url)
                .pathname,
        },
    },
}) 