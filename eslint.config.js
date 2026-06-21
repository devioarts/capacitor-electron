// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base JS recommended rules
  eslint.configs.recommended,

  // TypeScript rules (type-aware for src/cli and src/shared)
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.lint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── Security ───────────────────────────────────────────────────────────
      'no-eval': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],

      // ── Async safety ───────────────────────────────────────────────────────
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // ── Code quality ───────────────────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      // ── Relax rules that conflict with the existing codebase style ─────────
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // Test-file overrides — relax rules that conflict with test patterns
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Dynamic import() in type positions (e.g. InstanceType<typeof import(...)['X']>) is
      // legitimate in tests for typing dynamically-imported modules — no fix possible.
      '@typescript-eslint/consistent-type-imports': 'off',
      // Async stub methods intentionally omit await — they just return undefined.
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Ignore generated, built, and third-party code
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/template-electron/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
);
