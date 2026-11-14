/**
 * Injects the release signing config into the generated Android project.
 *
 * `android/` is produced by `expo prebuild` and never committed, so the signing
 * block cannot live there — the same reason the app config is the only source of
 * native truth. This plugin runs inside prebuild (dangerous mod, after the
 * template is written) and:
 *
 *   1. adds a `release` entry to `signingConfigs`, reading the upload key from
 *      Gradle properties (`BASHGINO_UPLOAD_STORE_FILE`, `_STORE_PASSWORD`,
 *      `_KEY_ALIAS`, `_KEY_PASSWORD`). CI writes those to
 *      `~/.gradle/gradle.properties`; developers can do the same locally.
 *   2. points the `release` build type at that config.
 *
 * With no keystore configured the release build type keeps the template's debug
 * fallback so `assembleRelease` still produces an installable APK on a laptop.
 * The release workflow explicitly refuses that fallback.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_BLOCK = `
        release {
            // Upload key, supplied through Gradle properties. Never committed.
            if (project.hasProperty('BASHGINO_UPLOAD_STORE_FILE')) {
                storeFile file(project.property('BASHGINO_UPLOAD_STORE_FILE'))
                storePassword project.property('BASHGINO_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('BASHGINO_UPLOAD_KEY_ALIAS')
                keyPassword project.property('BASHGINO_UPLOAD_KEY_PASSWORD')
                enableV1Signing true
                enableV2Signing true
            }
        }`;

function injectSigningConfig(contents) {
  if (contents.includes('BASHGINO_UPLOAD_STORE_FILE')) {
    return contents; // already patched — prebuild can run twice
  }

  // 1. Add the `release` signing config as the first entry of signingConfigs.
  const signingAnchor = /signingConfigs\s*\{/;
  if (!signingAnchor.test(contents)) {
    throw new Error('withReleaseSigning: no signingConfigs block in app/build.gradle');
  }
  contents = contents.replace(signingAnchor, (match) => `${match}${RELEASE_SIGNING_BLOCK}\n`);

  // 2. Use it for the release build type, replacing the template's debug fallback.
  const releaseBlock = /(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/s;
  if (releaseBlock.test(contents)) {
    contents = contents.replace(
      releaseBlock,
      (_match, prefix) =>
        `${prefix}signingConfig project.hasProperty('BASHGINO_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`
    );
  } else if (!/signingConfig\s+project\.hasProperty\('BASHGINO_UPLOAD_STORE_FILE'\)/.test(contents)) {
    throw new Error(
      'withReleaseSigning: could not find the release buildType signingConfig line. ' +
        'The Expo Android template changed — update this plugin.'
    );
  }

  return contents;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = injectSigningConfig(config.modResults.contents);
    return config;
  });
};

module.exports.injectSigningConfig = injectSigningConfig;
