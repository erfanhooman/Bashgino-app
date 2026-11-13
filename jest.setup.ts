/**
 * Project-wide test setup.
 *
 * `@testing-library/react-native` v14 installs its matchers automatically, so
 * nothing needs importing here. Only native modules that have no JS fallback
 * need a mock, and AsyncStorage is one: the theme provider reads the user's
 * theme choice from it on mount.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

/**
 * `lucide-react-native` ships its React Native build as ESM (`.mjs`), which
 * Jest cannot require without an extra transform. Icons carry no logic, so a
 * stand-in that renders a view is enough for component tests — and it keeps the
 * suite fast.
 */
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return new Proxy({}, { get: () => Icon });
});
