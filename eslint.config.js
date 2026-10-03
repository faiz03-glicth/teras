// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

/** Storage and backend SDKs: only core/ and features/*\/data may touch them. */
const DATA_SDKS = [
  { group: ['@supabase/*'], message: 'Supabase is only used in core/supabase and data/remote.' },
  {
    group: ['drizzle-orm', 'drizzle-orm/*', 'expo-sqlite', 'expo-sqlite/*'],
    message: 'SQLite is only used in core/db and data/local.',
  },
];
const ROUTER = { group: ['expo-router'], message: 'Navigate through src/shared/actions instead.' };
/** Views render and forward events; everything else goes through their ViewModel. */
const VIEW_ONLY = [
  {
    group: ['zustand', '@/features/*/state/*', '@/theme/state/*'],
    message: 'Views read state through their ViewModel.',
  },
  { group: ['@/features/*/data/*', '@/core/*'], message: 'Views never reach the Model layer directly.' },
];

/** Metro doesn't tree-shake, so the package root would bundle every icon. */
const ICON_BARREL = {
  name: 'lucide-react-native',
  message: "Import each icon from 'lucide-react-native/icons/<name>' (see src/shared/ui/icons.ts).",
};

const restrict = (patterns) => ['error', { paths: [ICON_BARREL], patterns }];

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: [
      'dist/*',
      '.*/**',
      '.expo/*',
      '.npm/*',
      'node_modules/*',
      'coverage/*',
      'reports/*',
      'src/core/db/migrations/*',
      'expo-env.d.ts',
    ],
  },
  {
    // The @typescript-eslint plugin is only registered for TypeScript files.
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      // Library module augmentation (e.g. Unistyles themes) uses `interface X extends Y {}`.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
    },
  },
  {
    // Node scripts and tool configs: CommonJS run by Node, never bundled into the app.
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
    rules: { 'expo/no-dynamic-env-var': 'off' },
  },
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': restrict([...DATA_SDKS, ROUTER]) } },
  {
    files: ['app/**/*.{ts,tsx}', 'src/shared/actions/**'],
    rules: { 'no-restricted-imports': restrict(DATA_SDKS) },
  },
  {
    files: ['src/core/**', 'src/features/*/data/**'],
    rules: { 'no-restricted-imports': restrict([ROUTER]) },
  },
  {
    files: [
      'src/shared/ui/**/*.tsx',
      'src/features/**/ui/**/*Screen.tsx',
      'src/features/**/ui/**/*Sheet.tsx',
      'src/features/**/ui/**/components/**',
    ],
    rules: { 'no-restricted-imports': restrict([...DATA_SDKS, ROUTER, ...VIEW_ONLY]) },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', 'test/**/*.{ts,tsx}', 'jest.setup.ts'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // jest.mock() factories must use require().
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
