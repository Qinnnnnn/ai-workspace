import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 120000, // 2 minutes for Docker container tests
    hookTimeout: 60000,
  },
})
