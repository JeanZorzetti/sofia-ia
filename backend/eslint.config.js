
const globals = require('globals');
const js = require('@eslint/js');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  prettierConfig,
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|req|res|next' }],
    },
  },
];
