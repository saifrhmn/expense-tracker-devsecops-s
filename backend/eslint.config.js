export default [{
  files: ['src/**/*.js', 'tests/**/*.js'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {
    console: 'readonly', process: 'readonly', Buffer: 'readonly', fetch: 'readonly'
  } },
  rules: { 'no-undef': 'error', 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
}];
