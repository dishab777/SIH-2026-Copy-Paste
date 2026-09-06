import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * The rules the type checker cannot see.
 *
 * TypeScript in strict mode with `noUnusedLocals` and `noUnusedParameters`
 * already carries most of the weight, so this stays deliberately short: the
 * ban on `any`, the hook rules, and the few patterns that silently produce
 * wrong behaviour rather than a type error.
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public/mockServiceWorker.js'] },

  // Build-time checks run in node, not the browser.
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', URL: 'readonly' } },
  },

  /*
   * The design audit is browser code on purpose: it measures contrast against
   * the background a page actually composites at run time, which no static
   * check can see. It is served from public/ so it can be loaded into a running
   * page, and it never ships in a route.
   */
  {
    files: ['public/audit-design.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
        location: 'readonly',
        console: 'readonly',
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'off', // tsc covers this, with better scoping
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'PRAYOG keeps no state in browser storage. Use the query cache or the ui store.' },
        { name: 'sessionStorage', message: 'PRAYOG keeps no state in browser storage. Use the query cache or the ui store.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='window'][property.name=/^(localStorage|sessionStorage)$/]",
          message: 'PRAYOG keeps no state in browser storage. Use the query cache or the ui store.',
        },
      ],
    },
  },
  {
    // The mock server is the one place that patches globals and logs on purpose.
    files: ['src/mocks/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
