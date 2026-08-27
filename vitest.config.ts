import { defineConfig } from 'vitest/config'
import * as path from 'path'

export default defineConfig({
  test: {
    // Scoped to src/ so the bundled tooling under .claude/skills — which ships
    // its own jest/mocha-style tests — is not swept into this project's suite.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // See the stub for why: keeps the 'server-only' marker meaningful in the
      // build without making those modules impossible to unit test.
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
