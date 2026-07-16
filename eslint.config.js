const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'coverage/**', '.expo/**', '.local/**'],
  },
  expoConfig,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@react-native-async-storage/async-storage',
              message: 'Используйте типизированный модуль src/storage, а не AsyncStorage напрямую.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/storage/index.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
