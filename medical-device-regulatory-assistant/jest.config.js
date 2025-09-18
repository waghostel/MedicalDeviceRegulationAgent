const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        ['@babel/preset-react', { 
          runtime: 'automatic',
          development: process.env.NODE_ENV === 'development',
          // React 19 specific options
          importSource: 'react',
          throwIfNamespace: false,
          // Fix JSX fragment parsing issues
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment'
        }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        // React 19 JSX fragment support
        ['@babel/plugin-transform-react-jsx', {
          runtime: 'automatic',
          importSource: 'react'
        }]
      ]
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@radix-ui|@testing-library|react-19-compat|@copilotkit|react|react-dom|@babel))'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
    '!src/lib/testing/**', // Exclude test utilities from coverage
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Component-specific thresholds
    'src/components/**/*.{js,jsx,ts,tsx}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Hook-specific thresholds
    'src/hooks/**/*.{js,jsx,ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coverageDirectory: '<rootDir>/coverage',
  // Test health monitoring reporter (Requirements 5.2 and 8.1)
  reporters: [
    'default',
    [
      '<rootDir>/src/lib/testing/jest-health-reporter.js',
      {
        outputDir: 'test-reports',
        failOnHealthIssues: process.env.CI === 'true' // Fail CI on health issues
      }
    ]
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
  ],
  testTimeout: 15000,
  maxWorkers: '75%', // Increased for better parallel execution
  // React 19 compatibility settings
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
    // React 19 specific jsdom options
    resources: 'usable',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  },
  // Enhanced error handling for React 19 AggregateError
  errorOnDeprecated: false, // Disabled for React 19 compatibility
  // React 19 specific globals and feature flags
  globals: {
    'ts-jest': {
      useESM: true,
    },
    // React 19 feature flags
    __REACT_DEVTOOLS_GLOBAL_HOOK__: {},
    __REACT_19_FEATURES_ENABLED__: true,
    __REACT_CONCURRENT_FEATURES__: true,
    __REACT_STRICT_MODE__: true,
  },
  // Simplified test categorization with consistent transform configuration
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.unit.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/__tests__/**/*.unit.{test,spec}.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { 
              targets: { node: 'current' },
              modules: 'commonjs'
            }],
            ['@babel/preset-react', { 
              runtime: 'automatic',
              development: process.env.NODE_ENV === 'development'
            }],
            '@babel/preset-typescript'
          ],
          plugins: [
            '@babel/plugin-transform-runtime'
          ]
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$|@radix-ui|@testing-library|react-19-compat|@copilotkit))'
      ],
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/**/*.integration.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/__tests__/**/*.integration.{test,spec}.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { 
              targets: { node: 'current' },
              modules: 'commonjs'
            }],
            ['@babel/preset-react', { 
              runtime: 'automatic',
              development: process.env.NODE_ENV === 'development'
            }],
            '@babel/preset-typescript'
          ],
          plugins: [
            '@babel/plugin-transform-runtime'
          ]
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$|@radix-ui|@testing-library|react-19-compat|@copilotkit))'
      ],
    },
    {
      displayName: 'accessibility',
      testMatch: [
        '<rootDir>/src/**/*.accessibility.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/__tests__/**/*.accessibility.{test,spec}.{js,jsx,ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { 
              targets: { node: 'current' },
              modules: 'commonjs'
            }],
            ['@babel/preset-react', { 
              runtime: 'automatic',
              development: process.env.NODE_ENV === 'development'
            }],
            '@babel/preset-typescript'
          ],
          plugins: [
            '@babel/plugin-transform-runtime'
          ]
        }]
      },
      transformIgnorePatterns: [
        'node_modules/(?!(.*\\.mjs$|@radix-ui|@testing-library|react-19-compat|@copilotkit))'
      ],
    },
  ],
  // Performance monitoring
  slowTestThreshold: 5,
  // Enhanced error reporting
  verbose: true,
  errorOnDeprecated: false, // Disabled for React 19 compatibility
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  restoreMocks: true,
  // Global setup and teardown
  globalSetup: '<rootDir>/src/lib/testing/global-setup.js',
  globalTeardown: '<rootDir>/src/lib/testing/global-teardown.js',
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);