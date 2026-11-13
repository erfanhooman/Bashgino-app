/**
 * Jest.
 *
 * `jest-expo` supplies the React Native transform and the native-module mocks.
 * The mapper points the shared packages at their TypeScript sources, because
 * they are consumed as source (no build step) by Metro, tsc and Jest alike.
 */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/flash-list|lucide-react-native)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Vendored in this repository — `packages/*` are folders, not npm packages.
    "^@bashgino/domain$": "<rootDir>/packages/domain/src/index.ts",
    "^@bashgino/types$": "<rootDir>/packages/types/src/index.ts",
  },
  modulePaths: ["<rootDir>/node_modules"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/app/**", "!**/*.d.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/android/", "/ios/"],
};
