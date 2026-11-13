// Learn more https://docs.expo.dev/guides/monorepos/
//
// This repository IS the app: `packages/domain` and `packages/types` are
// vendored in-tree and consumed as TypeScript source (no build step), which is
// why they are plain folders rather than npm dependencies. Metro has to watch
// them, and the resolver has to be told where the scoped paths live — otherwise
// a change in packages/domain is invisible until a full restart.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(projectRoot, "packages")];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "@bashgino/domain": path.resolve(projectRoot, "packages/domain/src"),
  "@bashgino/types": path.resolve(projectRoot, "packages/types/src"),
};

module.exports = config;
