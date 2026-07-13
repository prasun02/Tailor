import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        Deno: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['supabase/functions/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
);

