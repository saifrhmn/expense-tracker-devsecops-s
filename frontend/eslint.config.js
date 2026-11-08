export default [{
  files: ['src/**/*.jsx', 'src/**/*.js', 'tests/**/*.js'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: {
    window: 'readonly', document: 'readonly', navigator: 'readonly', console: 'readonly',
    fetch: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', URLSearchParams: 'readonly', Date: 'readonly', Intl: 'readonly', Object: 'readonly', Math: 'readonly', Number: 'readonly', String: 'readonly', File: 'readonly', Blob: 'readonly', URL: 'readonly', alert: 'readonly'
  } },
  rules: { 'no-undef': 'error', 'no-unused-vars': 'off' }
}];
