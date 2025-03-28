import { defineConfig } from 'vitest/config';
import { workersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineConfig({
  test: {
    ...workersConfig(),
    environment: '@cloudflare/vitest-pool-workers',
    
    // Include all test files in the test directory
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    
    // Configure code coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Set coverage thresholds
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      // Include all source files for coverage reporting
      include: ['src/**/*.{js,ts}'],
      // Exclude test files and configuration files
      exclude: [
        '**/*.d.ts',
        '**/*.test.*',
        '**/node_modules/**',
        '**/dist/**',
        'coverage/**',
        'test/**',
        'vitest.config.js',
        'wrangler.toml',
        '**/worker/**',
        '**/.wrangler/**',
      ],
    },
    
    // Timeouts and retry settings
    testTimeout: process.env.CI === 'true' ? 30000 : 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    
    // Cloudflare Workers specific configuration
    poolOptions: {
      workers: {
        singleThread: false,
        wrangler: {
          configPath: './wrangler.toml',
          // Use testing environment variables
          vars: {
            ENV: 'test',
          },
          // D1 database configuration for tests
          d1Databases: [
            {
              binding: 'DB',
              database_name: 'medicine-test',
              database_id: 'test-db-id', // This will be overridden in CI
            },
          ],
          // KV namespace configuration for tests
          kVNamespaces: [
            {
              binding: 'CACHE',
              id: 'test-cache-id',
            },
          ],
        },
      },
    },
    
    // Other test settings
    globals: true,
    setupFiles: ['./test/setup.js'],
    
    // CI-specific configuration
    allowOnly: process.env.CI !== 'true',
    retry: process.env.CI === 'true' ? 2 : 0,
    logHeapUsage: process.env.CI === 'true',
    bail: process.env.CI === 'true',
    includeSource: true,
    
    // Run tests in sequence in CI to avoid potential concurrency issues
    sequence: process.env.CI === 'true' ? {
      shuffle: false,
      concurrent: false,
    } : {
      shuffle: false,
      concurrent: true,
    },
    
    // Update snapshots in local but not in CI
    updateSnapshot: process.env.CI !== 'true',
  },
});
