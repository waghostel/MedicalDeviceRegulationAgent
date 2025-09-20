import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'coverage/**',
      'dist/**',
      '*.min.js',
      'public/**',
      '.kiro/**',
    ],
  },

  // Base configurations - Next.js and TypeScript
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Airbnb base rules (without TypeScript-specific ones that cause conflicts)
  ...compat.extends('airbnb-base'),

  // Prettier integration (must be last to override other formatting rules)
  ...compat.extends('prettier'),

  // TypeScript and React files configuration
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-require-imports': 'error',

      // React specific rules
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/jsx-props-no-spreading': [
        'warn',
        {
          html: 'enforce',
          custom: 'ignore',
          explicitSpread: 'ignore',
        },
      ],
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/require-default-props': 'off',
      'react/jsx-filename-extension': [
        'error',
        {
          extensions: ['.tsx'],
        },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import rules (Airbnb style)
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'off',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-unresolved': 'off', // TypeScript handles this

      // Accessibility rules
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],

      // Airbnb JavaScript style rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
        },
      ],
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['state', 'acc', 'accumulator'],
        },
      ],
      'consistent-return': 'off', // TypeScript handles this
      'array-callback-return': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: true,
          object: true,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],

      // Medical device specific rules
      'max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
    },
  },

  // JavaScript configuration files and utility scripts
  {
    files: [
      '*.config.js',
      '*.config.mjs',
      'jest.config.js',
      'test-*.js',
      'validate-*.js',
      'fix-*.js',
      'quick-*.js',
      '*-validation*.js',
      '*-monitor*.js',
      '*-integration*.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-console': 'off',
      'global-require': 'off',
      'import/no-unresolved': 'off',
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'prefer-const': 'warn',
      'prefer-template': 'warn',
      'no-plusplus': 'off',
      'max-classes-per-file': 'off',
      'class-methods-use-this': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'no-promise-executor-return': 'off',
      'no-else-return': 'off',
      'arrow-body-style': 'off',
    },
  },

  // Test files configuration
  {
    files: ['**/__tests__/**/*', '**/*.{test,spec}.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'import/no-extraneous-dependencies': 'off',
      'react/jsx-props-no-spreading': 'off',
      'no-console': 'off',
      'max-len': 'off',
      complexity: 'off',
    },
  },

  // Next.js specific files (pages and app directory)
  {
    files: ['src/pages/**/*', 'src/app/**/*', 'pages/**/*', 'app/**/*'],
    rules: {
      'import/no-default-export': 'off',
      'import/prefer-default-export': 'error',
    },
  },
];

export default eslintConfig;
