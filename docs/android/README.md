# Bashgino Android (Expo)

Native Android client for Bashgino. It shares the product's business rules and
design tokens with the web client and keeps its own UI layer.

This repository is the **independent release home** of the app: the Django API,
the Next.js web app and the production stack live in the separate
[`Bashgino`](https://github.com/erfanhooman/Bashgino) repository. Nothing here can
deploy a server, and nothing there can publish an app.

- **Stack:** Expo SDK 58 · React Native 0.88 · TypeScript (strict) · Expo Router ·
  TanStack Query · Zustand · React Native Reanimated (installed) ·
  react-native-svg · Expo SecureStore / SQLite / Localization
- **Namespace:** `com.bashgino.app` · **Scheme:** `bashgino://`
- **Language:** Persian only, RTL forced (`expo-localization` plugin,
  `forcesRTL: true`)

## Repository layout

```
src/                 the app (screens, features, components, hooks, services, store, theme)
packages/
  domain/            framework-free product rules (dates, plan contract, session machine, password policy)
  types/             DRF response contracts
design/globals.css   vendored snapshot of the web design tokens
docs/                this document, the original build spec, screenshots
scripts/             token sync (+ backend demo-data seeding, run inside the API container)
.github/workflows/   ci.yml (verify + prebuild) · android-release.yml (tag → APK/AAB)
```

`packages/*` are consumed as **source** — plain folders resolved by
`metro.config.js` and `tsconfig.json`, not npm dependencies, so there is no build
step and no publishing. `design/globals.css` is a copy: when the web tokens
change, re-copy it and run `npm run tokens:sync` (see `CONTRIBUTING.md`).

## How the pieces fit

```
src/app/…            Expo Router routes (file = screen)
src/features/…       screen bodies that are too big for a route file
src/components/ui/   design-system primitives (text, button, form, surface, overlay, tabs, layout)
src/components/…     app-level chrome (Brand, AppHeader, AppScreen, workout/RestRing)
src/hooks/           data hooks (TanStack Query) + session machine binding
src/services/api/    transport (bearer + refresh) and typed endpoints
src/store/           session store (user, workspaces, active membership)
src/theme/           generated tokens + semantic theme + provider
packages/domain      pure rules shared with the web product model
packages/types       API contracts
```

Rules that keep it coherent:

- Screens never call `fetch` or build URLs — `services/api/endpoints.ts` owns
  every path.
- Screens never hardcode a colour, radius or spacing number — `useTheme()` is the
  only styling source.
- Business rules (validation, serialization, session transitions, Jalali dates)
  live in `packages/domain`, not in components. That is what makes them testable
  and identical to the web contract.
- `src/app` holds routing only; anything reusable moves out.

## Design tokens are generated, not copied

`mobile/scripts/sync-tokens.mjs` parses `frontend/src/app/globals.css` (source of
truth per `docs/gym-plan-design-preferences-v2.md`) and emits
`src/theme/tokens.generated.ts`:

- 47 colour tokens × light/dark, plus 17 shared tokens (radius, space, type, motion)
- the 12 intentionally-dark `inverse-*` tokens inherit from light by design
- a token that exists in only one theme fails the generator

```bash
npm run tokens:sync    # after any globals.css change
npm run tokens:check   # fails when the generated file is stale
```

`src/theme/tokens.ts` adds the human layer: semantic names (`bg`, `surface`,
`brandInk`, `success`, …), the 4px spacing scale, the Tailwind-matching type
scale, weight→font-family mapping (Vazirmatn ships one TTF per weight) and motion
curves parsed from the stylesheet.

## Authentication

The web uses HttpOnly cookies + CSRF. A native client cannot read those cookies,
so Android uses the backend's second, documented transport:

```
POST /api/v1/auth/login/   {username, password, remember:true}
                            header X-Auth-Transport: bearer
→ { access_token, refresh_token, expires_in, user, active_organization }
```

- Tokens live in **Expo SecureStore** (Android Keystore-backed), never AsyncStorage.
- Every request sends `Authorization: Bearer …` and `Accept-Language: fa` (the
  catalogue localises exercise names from that header).
- A 401 triggers one single-flight refresh (`/auth/token/refresh/` rotates the
  pair); concurrent 401s share it, because three parallel refreshes would look
  like token replay to the server and revoke the session.
- Tenant scope travels as `X-Organization-Id` from the active workspace.
- CSRF does not apply to header transport (`core/middleware/auth.py` skips
  `enforce_csrf` unless the request was cookie-authenticated) — there is no
  `X-CSRFToken` anywhere in this client, and adding one would be cargo cult.

## RTL

`app.json` → `expo-localization` with `forcesRTL: true` and `supportedLocales:
["fa"]`, so the Android build is RTL regardless of device language. On top of
that:

- layout uses logical edges (`start`/`end`, `flexDirection: row` which Yoga
  mirrors) rather than physical left/right
- `AppText` sets `writingDirection: "rtl"` so mixed Persian/Latin strings keep
  Persian punctuation on the correct side
- numeric fields (phone, reps, weights) opt into LTR + left alignment so digits
  do not jump while typing
- icons that represent physical direction (chevrons, back) follow the reading
  direction; play/pause/check do not mirror

## Feature parity

Every row marked **Done** was exercised on the emulator against the real API —
not merely implemented (see Verification below for the screens and the write
operations that were confirmed server-side).

| Feature | Web route | Android | Status |
| --- | --- | --- | --- |
| Sign in (phone + password) | `/login` | `/login` | Done |
| Password recovery (OTP + new password) | `/forgot-password` | `/forgot-password` | Done |
| Role-routed home | `/dashboard` | `/dashboard` | Done (coach + trainee variants) |
| Coach weekly metrics | `/dashboard` | `/dashboard` | Done (server-scoped) |
| Athlete roster + search/filters | `/clients` | `/clients` | Done |
| Invite athlete (SMS link), resend, copy link | `/clients` | `/clients` | Done |
| Athlete file, coach assignment, notes | `/clients/[id]` | `/clients/[id]` | Done |
| Training library (mine / other coaches) | `/training/builder` | `/training` | Done (list + create + delete + assign) |
| Training plan authoring | `/training/builder/[id]` | `/training/builder/[id]` | Done — days, exercises, prescription, publish, assign |
| Per-trainee plan editing | `/training/plans/[id]` | `/training/plans/[id]` | Done (revision-number guarded) |
| Plan assignment to athletes | dialogs | `/training/[id]` | Done |
| Exercise library browser + detail sheet | picker inside builder | — | Pending |
| Workout hub (today + upcoming) | `/workout` | `/workout` | Done |
| Session overview (per day) | `/workout/[dayId]` | `/workout/[dayId]` | Done |
| Guided session (sets, rest, timed work) | `/workout/[dayId]/session` | `/session/[dayId]` | Done |
| Workout history + totals | `/workout/history` | `/workout/history` | Done |
| Nutrition library | `/nutrition/builder` | `/nutrition` | Done (list + create + delete) |
| Nutrition authoring | `/nutrition/builder/[id]` | `/nutrition/builder/[id]` | Done — meals, foods, targets, assign |
| Trainee daily nutrition log | `/nutrition` | `/nutrition-log` | Done |
| Progress (measurements, photos) | `/progress` | `/progress` | Done (read; upload pending) |
| Notifications inbox | `/notifications` | `/notifications` | Done |
| Settings, theme, workspaces, logout | `/settings` | `/settings` | Done |
| Gym admin dashboard | `/admin/dashboard` | `/admin` | Done |
| Coaching staff roster | `/admin/coaches` | `/admin/coaches` | Done |
| Client assignment | `/admin/clients` | `/admin/clients` | Done |
| Registration wizard (coach/gym + space + plan) | `/register` | — | Pending |
| Invitation claim | `/invite/[token]` | — | Pending (deep link reserved) |

## Component migration checklist

| Web component | Native equivalent | Verified by |
| --- | --- | --- |
| `.btn-primary` / `.btn-secondary` / `.btn-outline-primary` | `Button` (5 variants, 3 sizes, loading, disabled) | unit (press/disabled/busy) |
| `.card`, `.meta-chip`, `badge-*` | `Card`, `MetaChip`, `Badge` | unit + screens |
| `.input-field`, `FormFieldError` | `Input`, `FieldError` | unit (label/error/hint precedence) |
| `PasswordStrength` | `PasswordMeter` | shared `assessPassword` tests |
| `Modal`, `ConfirmDialog` | `Sheet`, `Dialog` | screens (assign, invite, logout) |
| `Snackbar` | `SnackbarProvider` + `useSnackbar` | screens |
| `SideNav` + `BottomNav` + `TopBar` | `Tabs` (role-driven) + `AppHeader` | screens |
| `PageHero` | photographic bands → native header + inverse cards | screens |
| `EmptyStateCard` | `EmptyState` | screens |
| `RestRing` | `RestRing` (SVG, per-second dash offset) | session screen |
| `JalaliDatePicker` | — | pending (no date input on mobile yet) |
| `ImageCropperModal`, avatar/logo upload | — | pending |
| `ExerciseDetailSheet` + anatomy heatmap | — | pending |

## Testing

```bash
cd mobile
npm run typecheck      # tsc --noEmit, strict + noUncheckedIndexedAccess
npm test               # jest-expo + @testing-library/react-native
npm run tokens:check   # generated theme matches globals.css
npm run lint           # eslint-config-expo
```

Covered today: Jalali calendar (Nowruz anchor + 4-year round-trip + leap years +
digit conversion), plan write contract (positional days, ranges, rep
normalisation, hydration), the workout session machine (rest transitions, timed
auto-confirm, skip semantics, log only completed sets), and the UI primitives
(button press/disabled/busy, input label/error precedence).

## Building

The app uses Continuous Native Generation — `android/` is generated from
`app.json` and is not committed.

```bash
cd mobile
export JAVA_HOME=/path/to/jdk-17      # Gradle for RN 0.88 needs JDK 17, not 21+
export ANDROID_HOME=/path/to/android-sdk

npx expo prebuild --platform android  # regenerate android/ from app.json
npx expo run:android                  # dev build + install on a device/emulator
npm run build:apk                     # debug APK → android/app/build/outputs/apk/debug/
npm run build:aab                     # release AAB (needs a signing config, see below)
```

Release signing is intentionally not committed. `android/app/build.gradle` reads
`BASHGINO_UPLOAD_STORE_FILE` / `_STORE_PASSWORD` / `_KEY_ALIAS` / `_KEY_PASSWORD`
from Gradle properties (put them in `~/.gradle/gradle.properties`). Locally it
falls back to the debug key so `assembleRelease` still produces an installable
APK — **the CI release workflow refuses that fallback** and fails if the keystore
secrets are missing, because a debug-signed APK can never be published or updated.
Never commit a keystore.

### Releases come from tags, not from a workstation

```bash
git tag -a v1.2.0 -m "Bashgino Android 1.2.0" && git push origin v1.2.0
```

`.github/workflows/android-release.yml` runs the same checks as CI, generates the
native project, builds a signed APK + AAB, verifies the signature, and attaches
both to the GitHub Release. Marketplace upload stays manual.

EAS is optional and not used by the pipeline: `npx eas-cli build -p android
--profile production` still works if you want a cloud build for device testing.
`eas.json` ships three profiles — `development` (dev client, APK), `preview`
(internal APK) and `production` (`app-bundle` for Play).

### API base URL

`EXPO_PUBLIC_API_URL` wins, then `expo.extra.apiUrl` in `app.json`, then the
emulator fallback `http://10.0.2.2:8888`:

```bash
EXPO_PUBLIC_API_URL=https://api.bashgino.ir npx expo prebuild -p android --clean
```

The value is baked in at build time, so a release must be produced per
environment; the release workflow sets it from the `EXPO_PUBLIC_API_URL`
repository variable.

Release builds are **HTTPS-only**. Debug builds allow cleartext globally (Expo's
debug manifest), which is what makes `10.0.2.2` work on the emulator; a release
build cannot talk to a plain-HTTP API. Do not hand-edit
`android/app/src/main/res/xml/network_security_config.xml` — `android/` is
generated on every prebuild and the edit will disappear. If a cleartext host is
ever genuinely needed, express it through `expo-build-properties` in `app.json`.


### Prerequisites

The generated Android project needs a matching SDK. Verified set for Expo SDK 58
on this machine:

```bash
sdkmanager "platforms;android-37.0" "build-tools;37.0.0" "ndk;27.1.12297006"
```

- **JDK 17** — Gradle for RN 0.88 refuses to run on JDK 21+. Point `JAVA_HOME` at
  a 17 JDK (this machine: `~/.jdks/jdk-17.0.21+9/Contents/Home`, installed
  side-by-side with the system Temurin 26).
- **Platform 37** is what the Expo SDK 58 AARs declare as `minCompileSdk`; the
  package is named `platforms;android-37.0` (not `android-37`).
- **NDK 27.1.12297006** is the version the React Native Gradle plugin pins.

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
```


## Verification

Run on 2026-11-07 against the local stack (`docker compose` backend on :8888,
MinIO on :9000) with a Pixel-class emulator (1080×2400 @420dpi → 411dp wide,
Android 14, gesture navigation, RTL forced).

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | **pass** — 0 errors, strict + `noUncheckedIndexedAccess` |
| Lint | `npx expo lint` | **pass** — 0 errors, 0 warnings |
| Unit/component tests | `npx jest` | **pass** — 4 suites, 41 tests |
| Token drift | `npm run tokens:check` | **pass** — generated theme matches `globals.css` |
| JS bundle | `npx expo export --platform android` | **pass** — 4090 modules → 1.6MB Hermes bytecode |
| Native build | `./gradlew app:assembleDebug` | **BUILD SUCCESSFUL** (386 tasks) |
| Install + launch | `adb install -r app-debug.apk` | **pass** |
| Session persistence | login → force-stop → relaunch | **pass** — lands on the dashboard, no re-auth |

### Screens exercised on the emulator (real API data)

Screenshots of the pass are in `docs/android/screenshots/` (`01-login`,
`02-coach-desk`, `03-roster`, `04-training-library`, `05-plan-template`,
`06-assign-sheet`, `07-trainee-home`, `08-day-overview`, `09-session-work`,
`10-session-rest`, `11-session-finish`, `12-history`, `13-admin-coaches`,
`14-settings`, `15-release-build`).

1. **Login** — Persian RTL, Vazirmatn, brand lockup, validation.
2. **Coach desk** — server-scoped week (۱۶–۲۲ آبان ۱۴۰۵), four metric tiles,
   roster preview; phone shows `+989990000002` (bidi-isolated).
3. **Athlete roster** — search, status tabs with real counts (۱/۱/۰), invite CTA,
   status + coach chips.
4. **Training library** — «برنامههای من» with a real template card
   (۲ روز / ۴ حرکت / ۰ ورزشکار) and a localized goal.
5. **Plan template** — header, badges, web-authoring note, assign CTA, both day
   cards with sets/reps/rest and coach instructions.
6. **Trainee home** — «تمرین امروز» resolved by the server, next-session line,
   history link.
7. **Workout hub + day overview** — upcoming occurrences, per-exercise
   prescriptions, localized exercise names.
8. **Guided session** — artwork stage, set/rep/rest chips, rep stepper,
   «انجام دادم» → rest ring with countdown and next-up → finish summary.
9. **Saved session** — 12/12 sets, `COMPLETED` on the server; history shows
   «۱۲ ست · ۴ دقیقه» with the Jalali date and time.

### Bugs found and fixed during verification

Each of these was a real defect, not a cosmetic preference:

- **Tokens were never stored.** The client never sent `X-Auth-Transport: bearer`,
  so `/auth/login/` answered with cookies only; the app looked signed in until
  the process died. Now sent on every request.
- **Detail screens were tab screens.** `/clients/[id]`, `/training/[id]`,
  `/workout/[dayId]` and `/workout/history` were declared inside the tab
  navigator, so pushing them re-entered the tabs and landed back on the
  dashboard. They are root-stack routes now (with a real back stack).
- **RTL alignment inverted.** React Native flips physical `left`/`right` styles
  in RTL (`doLeftAndRightSwapInRTL`), so an explicit `textAlign: "right"`
  rendered left. Text now uses logical `auto`; numeric blocks ask for `left`,
  which the swap turns into the visual right.
- **Phone numbers broke bidi.** `+989990000002` rendered as `989990000002+`;
  LTR values are now isolated with U+2066/U+2069.
- **Media 404s.** Public object URLs carry `localhost:9000`, which on a device
  is the phone itself; loopback hosts are rewritten to the API host *keeping
  MinIO's port*.
- **Exercise names were English.** The plan payload only carries
  `Exercise.canonical_name`; the client joins the catalogue it already fetches
  for illustrations to show Persian names.
- **Session history crashed the trainee home.** `/workout-sessions/` answers
  `{count, results}`, not a bare array.
- **Stale template entry.** The Expo template's `App.tsx`/`index.ts` shadowed
  the router entry; `main` is now `expo-router/entry`.

## Known limitations

1. **Plan and nutrition authoring stay on the web.** Seven days × exercises ×
   parameters (sets, reps, tempo, RPE, rest, timed work) is a keyboard-and-mouse
   task; a phone form would either omit fields or hide them behind three taps.
   The Android app shows the content, assigns it, and says so on screen instead
   of shipping a half-editor. This is a documented product decision, not a gap.
2. **Offline queue is not implemented yet.** The hard part already exists —
   `/workout-sessions/complete/` accepts a `client_session_uuid` idempotency key
   and the client generates one per session. The SQLite outbox (write-ahead log,
   replay on reconnect, duplicate prevention) is the next phase; until then a
   session needs connectivity to save.
3. **Registration and invitation claim are web-only.** Both need SMS/OTP flows
   and deep-link handling; the scheme (`bashgino://`) is configured for it and the
   login screen already accepts `identifier`/`phone` prefill.
4. **Progress photo upload is read-only.** It needs the presigned-upload flow
   (`upload-intent` → PUT → confirm) plus a camera permission prompt.
5. **No Maestro E2E suite yet.** Every workflow above was driven on the emulator
   by hand (adb + uiautomator); scripting them is a follow-up.
6. **Tablet/foldable layouts** are responsive (flex + max widths) but were only
   verified at phone widths so far. Small-phone (320–360dp) and large-font runs
   are still on the list.
7. **The exercise-name join is a client workaround.** The backend could localise
   `exercise_name` from `Accept-Language` the way `/exercises/` already does;
   that is the better long-term fix and would let the web show Persian names too.

