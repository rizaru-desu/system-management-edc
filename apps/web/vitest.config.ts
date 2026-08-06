import { fileURLToPath } from 'node:url'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Component-test config, separate from vite.config.ts so the app build
 * (tanstackStart, devtools, tailwind) stays untouched. The `#` alias mirrors
 * the package.json "imports" mapping.
 */
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // lib/env.ts validates this at import time (it sits on the console
    // feature's import chain); no test ever calls the API.
    env: { VITE_API_URL: 'http://localhost:3001' },
  },
})
