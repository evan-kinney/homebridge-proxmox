import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

const config = [
  {
    files: [
      '*.ts',
      'src/**/*.ts'
    ],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Extend recommended TypeScript rules
      ...tsPlugin.configs.recommended.rules,

      // Custom rules
      'quotes': ['warn', 'single'],
      'semi': 'off',
      'comma-dangle': ['warn', 'never'],
      'dot-notation': 'off',
      'eqeqeq': 'warn',
      'curly': 'off',
      'brace-style': ['warn'],
      'prefer-arrow-callback': ['warn'],
      'max-len': ['warn', 140],
      'no-console': ['warn'],
      'no-non-null-assertion': 'off',
      'comma-spacing': ['error'],
      'no-multi-spaces': ['warn', { ignoreEOLComments: true }],
      'no-trailing-spaces': ['warn'],
      'lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],

      // TypeScript-specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/semi': 'off',
      '@typescript-eslint/member-delimiter-style': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.homebridge/**']
  }
];

export default config;