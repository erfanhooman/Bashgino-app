# Bashgino — Android

Native Android client for Bashgino (Expo SDK 58 · React Native 0.88 · Expo Router).
This repository is the **independent release home** of the mobile app.

- **Namespace / applicationId:** `com.bashgino.app`
- **Scheme:** `bashgino://`
- **Language:** Persian only, RTL forced (`expo-localization`, `forcesRTL: true`)
- **API:** `https://api.bashgino.ir` (build-time, `EXPO_PUBLIC_API_URL`)

The web app, Django API and production infrastructure live in the separate
[`Bashgino`](https://github.com/erfanhooman/Bashgino) repository. Nothing here
can deploy the server, and nothing there can publish an app.

## Layout

```
src/app/            Expo Router routes (file = screen)
src/features/       screen bodies too large for a route file
src/components/     design-system primitives and app chrome
src/hooks/          TanStack Query hooks + session machine binding
src/services/api/   transport (bearer + refresh) and typed endpoints
src/store/          session store (user, workspaces, active membership)
src/theme/          generated tokens + semantic theme + provider
packages/domain/    framework-free product rules (dates, plan contract, session machine, password policy)
packages/types/     DRF response contracts
design/globals.css  vendored snapshot of the web design tokens
docs/               architecture notes, the original build spec, screenshots
scripts/            token sync + backend demo-data seeding
```

Rules that keep it coherent:

- Screens never call `fetch` or build URLs — `services/api/endpoints.ts` owns every path.
- Screens never hardcode a colour, radius or spacing number — `useTheme()` is the only styling source.
- Business rules live in `packages/domain`, not in components.
- `src/app` holds routing only.

## Local development

```bash
npm ci
npm start            # Metro
npm run android      # build + install on a device/emulator
npm run verify       # typecheck + lint + tokens + tests (what CI runs)
```

The emulator reaches the host API through `http://10.0.2.2:8888`, which is the
`app.json` → `extra.apiUrl` fallback. Override it with `EXPO_PUBLIC_API_URL` for a
physical device on the LAN.

## Releases

Tag on `main`:

```bash
git tag -a v1.2.0 -m "Bashgino Android 1.2.0"
git push origin v1.2.0
```

`.github/workflows/android-release.yml` then:

1. resolves `versionName`/`versionCode` from the tag (`1.2.3` → `10203`),
2. refuses to build without the upload keystore,
3. runs `npm run verify`,
4. `expo prebuild` → `assembleRelease` + `bundleRelease`,
5. **verifies the APK is not debug-signed**,
6. attaches `bashgino-<version>.apk` and `.aab` to the GitHub Release.

### Required repository configuration

| Kind | Name | Purpose |
| --- | --- | --- |
| variable | `EXPO_PUBLIC_API_URL` | `https://api.bashgino.ir` — inlined into the bundle |
| secret | `ANDROID_KEYSTORE_BASE64` | `base64 -i release.jks` of the upload key |
| secret | `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| secret | `ANDROID_KEY_ALIAS` | key alias |
| secret | `ANDROID_KEY_PASSWORD` | key password |

Generate the upload key **once** and keep it backed up somewhere durable. Losing
it means the app can never be updated on any store under the same package name:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore bashgino-upload.jks -alias bashgino \
  -keyalg RSA -keysize 4096 -validity 10000
base64 -i bashgino-upload.jks | pbcopy      # → ANDROID_KEYSTORE_BASE64
```

Never commit the keystore — `.gitignore` already blocks `*.jks`, `*.keystore`,
`*.p12` and `*.pem`.

### Marketplace publishing is manual

The pipeline stops at the GitHub Release. Uploading the `.aab` to Google Play,
Myket or Bazaar stays a human action. `eas.json` is kept for developers who
prefer EAS for local device builds; the release workflow does not use it.
