import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * Flat config. `eslint-config-next` ships native flat configs in v16, so no
 * FlatCompat shim is needed.
 */
const config = [
  {
    ignores: [
      '.next/**',
      'marketing/.next/**',
      'marketing/out/**',
      'marketing/next-env.d.ts',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.data/**',
      // Packaged distribution: a copy of the build plus vendored node_modules.
      'dist/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Unused args are meaningful in handler signatures; require a `_` prefix
      // so the intent is explicit rather than banning them outright.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // `any` defeats the point of a strict TypeScript codebase (§170).
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // CLI scripts exist to print to the terminal.
    files: ['scripts/**/*.ts', 'scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
]

export default config
