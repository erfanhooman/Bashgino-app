# Task: Native Android app (Expo) — Phase 1→4 delivery

- **Started:** 2026-11-06
- **Owner:** Erfan Hooman
- **Status:** delivered — foundation, auth, coach desk, admin panel, trainee workout flow; production build verified on device
- **Scope:** add a native Android client beside the existing Next.js app without changing the web app's behaviour.

## Decisions taken (with the user, before coding)

1. **Additive workspace, not `apps/web`.** The web app stays at `frontend/`. It is built and served by
   the running `bashgino-frontend` container from `./frontend` (docker-compose build context + bind
   mount) and carries its own `package-lock.json`; moving it would mean rebuilding the live stack for
   zero product benefit. The repo therefore reads:

   ```
   backend/      unchanged Django API
   frontend/     unchanged Next.js app
   mobile/       new Expo app (own package.json + lockfile)
   packages/     shared, framework-free TS: domain rules + API types
   docs/android/ architecture, parity matrix, limitations
   ```

2. **Auth transport = bearer.** A native app cannot read the web's HttpOnly cookies, so the client
   uses the backend's documented second transport (`X-Auth-Transport: bearer` → tokens in the JSON
   body) and stores them in Expo SecureStore. CSRF does not apply to header transport
   (`core/middleware/auth.py` skips `enforce_csrf` unless the request was cookie-authenticated).

3. **Milestone 1 = foundation + auth + trainee workout flow + coach desk.** Full parity is ~30
   screens; the remaining screens are listed in the parity matrix rather than stubbed with fake data.

## What Phase 1 found

- 30 routes under `frontend/src/app`, 47 components, 5.4k lines of lib/hooks/context.
- 70 API endpoints (OpenAPI has no component schemas — types were derived by introspecting the DRF
  serializers in the running container).
- Auth: cookie sessions on web, bearer supported for native; password-only login (no OTP step),
  recovery by OTP, invitations by SMS link.
- Design system: tokens live in `frontend/src/app/globals.css`, spec in
  `docs/gym-plan-design-preferences-v2.md`; dark mode is designed, not inverted.

## Delivered in this pass

- `mobile/` Expo SDK 58 app, Expo Router, TypeScript strict, RTL forced for Persian.
- Native theme generated **from** `globals.css` (`npm run tokens:sync`, drift check in
  `tokens:check`) — 47 colours × 2 themes, no hand-copied hex.
- UI primitives: text, buttons, inputs, cards, badges, chips, tabs, sheet, dialog, snackbar, empty
  and error states, skeleton, stat tiles, avatar.
- Session store (workspace/role), bearer API client with single-flight refresh, TanStack Query.
- Screens: login, forgot-password, role-routed dashboard, client roster, client file, training
  library + template detail + assignment, workout hub/day/guided session/history, nutrition library
  and daily log, progress, notifications, settings, admin dashboard/coaches/assignment.
- Tests: Jalali calendar (anchor + 4-year round trip), plan contract, session machine, UI primitives.

## Explicitly not delivered yet

See `docs/android/README.md` § Parity matrix. The two decisions worth flagging:

- **Plan authoring stays on the web.** Editing 7 days × exercises × parameters is a keyboard task;
  the phone shows the plan and assigns it. This is a product decision, not an omission — recorded in
  the matrix.
- **Offline queue is not implemented.** The API already accepts an idempotency key
  (`client_session_uuid`), which is the hard part; the SQLite outbox is Phase 7.

## Verification log

Final run, 2026-11-07, against the local docker stack and a Pixel-class emulator
(1080×2400 @420dpi, RTL forced).

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | pass (0 errors, strict + `noUncheckedIndexedAccess`) |
| Lint | `npx expo lint` | pass (0 errors, 0 warnings) |
| Token drift | `npm run tokens:check` | pass (47 colours in sync with `globals.css`) |
| Unit/component tests | `npm test` | 4 suites, 41 tests passed |
| JS bundle | `npx expo export -p android` | pass — Hermes bytecode, 4090 modules |
| Debug build | `./gradlew app:assembleDebug` | BUILD SUCCESSFUL |
| Release build | `./gradlew app:assembleRelease` | BUILD SUCCESSFUL — 37.8 MB APK, standalone |
| Release install | `adb install -r app-release.apk` | pass — launches without Metro |
| Session persistence | login → force-stop → relaunch | pass (bearer tokens in SecureStore) |

Screens driven on the emulator with real data: login, coach desk, roster,
training library, plan template, assign sheet (server row created), trainee home,
workout hub, day overview, guided session (12/12 sets → `COMPLETED` on the
server), history, nutrition library, progress, notifications, settings (theme
switch), admin panel, staff roster, client assignment, athlete file.

Defects found during that pass and fixed — bearer transport never requested,
detail routes declared as tabs (pushes no-oped), RTL `textAlign` inverted by
`doLeftAndRightSwapInRTL`, bidi-broken phone numbers, MinIO `localhost` URLs
unreachable from the device, English exercise names, a `{count, results}`
envelope crashing the trainee home, a `{"coaches": []}` envelope crashing the
admin screens, and cleartext HTTP blocked in release builds. Full detail in
`docs/android/README.md` § Verification.

### Still open

- Offline outbox (SQLite) — the idempotency key exists, persistence does not.
- Plan/nutrition authoring stays on the web by decision.
- Registration and invitation claim (SMS/OTP + deep link).
- Progress photo upload, exercise-library browser, Jalali date picker.
- Maestro E2E suite; tablet and large-font runs.
- One dev-only React "unique key" warning appears on the assign sheet; it does
  not reproduce in release builds and is queued for a targeted fix.
