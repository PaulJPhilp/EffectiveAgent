import { resolve } from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [tsconfigPaths()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@services': resolve(__dirname, 'src/services'),
            '@core': resolve(__dirname, 'src/services/core'),
            '@ai': resolve(__dirname, 'src/services/ai'),
            '@capabilities': resolve(__dirname, 'src/services/capabilities'),
            '@pipeline': resolve(__dirname, 'src/services/pipeline'),
            '@docs': resolve(__dirname, 'src/services/docs'),
            '@test-harness': resolve(__dirname, 'src/services/test-harness'),
            '@effectors': resolve(__dirname, 'src/effectors'),
            '@ea': resolve(__dirname, 'src/ea'),
            '@ea-agent-runtime': resolve(__dirname, 'src/ea-agent-runtime')
            ,
            // Ensure tests resolve the ai-sdk to the source implementation so
            // vitest's hoisted vi.mock replaces the correct module instance.
            '@effective-agent/ai-sdk': resolve(__dirname, 'packages/effect-aisdk/src/index.ts')
        },
        extensions: ['.js', '.ts']
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/archive/**'],
        setupFiles: ['./src/ea-agent-runtime/__tests__/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/__tests__/helpers/**', '**/mocks/**', '**/archive/**']
        }
    }
})