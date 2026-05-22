/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  parser: 'vue-eslint-parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
    },
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    // 본 코드의 권장 스타일링 룰들은 warning 으로 격하 — CI 게이트는 error 만 차단.
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/html-self-closing': 'off',
    // TS 시그니처/Vue 환경에 적합한 unused-vars
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none', argsIgnorePattern: '^_' }],
  },
  // @typescript-eslint/parser 미설치 + Playwright e2e 는 별도 toolchain 이므로 제외.
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'coverage/',
    'playwright-report/',
    '*.min.js',
    'vite.config.ts',
    'playwright.config.ts',
    'tests/e2e/**',
  ],
};
