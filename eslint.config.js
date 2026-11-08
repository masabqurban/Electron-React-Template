import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['out', 'dist', 'release', 'coverage', 'playwright-report', 'test-results'] },

  js.configs.recommended,

  // Type-aware rules for TypeScript files only.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Main process and preload: Node environment.
  {
    files: ['src/main/**', 'src/preload/**', '*.config.ts', 'tests/**'],
    languageOptions: { globals: globals.node },
  },

  // The renderer is a web page: it must never import Electron or Node.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'electron/*'],
              message: 'The renderer talks to Electron only through window.api (src/renderer/src/lib/ipc.ts).',
            },
            {
              group: ['node:*', 'fs', 'path', 'child_process', 'os'],
              message: 'Node APIs are not available in the sandboxed renderer.',
            },
            { group: ['**/main/**', '**/preload/**'], message: 'Import shared code from @shared instead.' },
          ],
        },
      ],
    },
  },

  // Shared code runs in every process, so it can't depend on any of them.
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', 'react', '**/main/**', '**/renderer/**', '**/preload/**'],
              message: 'Shared code must stay environment-neutral.',
            },
          ],
        },
      ],
    },
  },

  // Tests may use the shared test helpers loosely.
  {
    files: ['**/*.test.ts', 'tests/**'],
    rules: { '@typescript-eslint/no-floating-promises': 'off' },
  },
);
