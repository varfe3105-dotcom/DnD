// Nur Fehlerprüfung: fängt fehlende Importe und Tippfehler, die Tests übersehen könnten.
export default [{
  files: ['src/**/*.js'],
  languageOptions: {
    ecmaVersion: 2023, sourceType: 'module',
    globals: Object.fromEntries(['document', 'window', 'localStorage', 'navigator', 'URL', 'Image', 'FileReader', 'setTimeout', 'clearTimeout', 'innerWidth', 'innerHeight', 'console', 'Blob', 'location', 'indexedDB', 'structuredClone', 'crypto', 'CSS'].map(n => [n, 'readonly'])),
  },
  rules: { 'no-undef': 'error', 'no-unused-vars': 'off' },
}];
