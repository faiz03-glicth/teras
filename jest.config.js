/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/ios',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Makes react-native-worklets resolve its JS (non-native) implementation under Jest.
  resolver: 'react-native-worklets/jest/resolver',
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  // CI keeps its npm cache and build output inside the project; Jest must not crawl them.
  modulePathIgnorePatterns: ['<rootDir>/.npm/', '<rootDir>/dist/', '<rootDir>/coverage/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-google-signin/.*|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-unistyles|react-native-nitro-modules|sonner-native|lucide-react-native))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^lucide-react-native/icons/.*$': '<rootDir>/test/mocks/lucideIcon.tsx',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/core/db/migrations/**', '!src/types/**'],
  // text-summary feeds the CI coverage badge; cobertura feeds GitLab's merge request diff coverage.
  coverageReporters: ['text-summary', 'cobertura', 'lcov'],
  // A floor just under current coverage: new code must be tested, and coverage can only go up.
  coverageThreshold: {
    global: { statements: 70, branches: 70, functions: 65, lines: 70 },
  },
};
