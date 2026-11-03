import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'dist-api', 'dist-worker', 'node_modules', '.worktrees', '.superpowers', 'graft', 'graphify-out', 'playwright-report', 'test-results', 'backups', '.backups', 'private-documents', '.platform-test'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['infra/scripts/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['design-library/specimens/**/*.js', 'design-library/prototypes/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['**/*.{ts,tsx}'], languageOptions: { globals: { ...globals.browser, ...globals.node } }, plugins: { 'react-hooks': hooks }, rules: { ...hooks.configs.recommended.rules } },
);
