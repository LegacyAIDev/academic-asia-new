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
    },
  },
})
