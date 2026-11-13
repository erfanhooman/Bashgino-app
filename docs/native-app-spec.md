# Task: Build a Production-Quality Native Android Application for Gym-Plan Using Expo

## 1. Project Overview

We have an existing Gym-Plan application built with:

- Next.js 14.2.15 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS 3.4
- Hand-built UI components
- No existing component library
- No existing state management library
- Custom application architecture and design system

Your task is to create a complete native Android application using Expo and React Native, inside the EXISTING repository.

The Android application must reproduce the existing web application's visual identity, UI structure, features, functionality and user workflows as closely as reasonably possible.

This is not a request to create a new design or simplify the application.

The objective is to provide an Android experience that looks and behaves like the existing web application while using proper native Android components and engineering practices.

## 2. Critical Rules

Before writing any code:

1. Thoroughly inspect the entire existing repository.
2. Understand the current architecture and folder structure.
3. Read all relevant project documentation.
4. Inspect the design preference documentation.
5. Inspect all existing pages, components, hooks, services, API integrations and business logic.
6. Understand the authentication system and user roles.
7. Understand the differences between organization, coach and trainee workflows.
8. Identify all existing routes and their functionality.
9. Identify all reusable business logic and TypeScript models.
10. Identify existing UI conventions, colors, typography, spacing, borders, radiuses, shadows and interaction patterns.

Do not start implementing before understanding the existing application.

**Do not modify or break the existing Next.js application.**

The existing web application must continue working exactly as before.

Do not replace existing business logic with mock data.

Do not create fake functionality just to make a screen look complete.

Do not silently omit existing features.

If an existing feature cannot be implemented properly on Android, document the reason and propose a suitable native alternative.

## 3. Repository Architecture

Use a monorepo architecture.

The existing repository should evolve into the following structure, adapting it to the actual repository where necessary:

```text
gym-plan/
│
├── apps/
│   ├── web/
│   │   └── Existing Next.js application
│   │
│   └── mobile/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── services/
│       ├── navigation/
│       ├── theme/
│       ├── assets/
│       ├── constants/
│       ├── utils/
│       ├── app.json
│       └── package.json
│
├── packages/
│   ├── types/
│   ├── schemas/
│   ├── api/
│   ├── domain/
│   ├── constants/
│   └── utils/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── ...
```

This is the target architecture, not a reason to move everything blindly.

If the existing project uses a different package manager or structure, evaluate the migration first.

Use pnpm workspaces and Turborepo if appropriate.

Important:

- Keep web and mobile independently buildable.
- Keep web and mobile independently deployable.
- Share business logic and data contracts wherever possible.
- Keep platform-specific UI implementations separate.
- Avoid unnecessary abstractions.
- Avoid circular dependencies.
- Never import Next.js components into React Native.
- Never import browser-only modules into native application code.

Before moving the existing application into `apps/web`, verify that existing development, production builds, deployment configuration, environment variables and scripts continue working.

## 4. Technology Stack

Use the following mobile technology stack:

| Concern | Technology |
|---|---|
| Framework | Expo |
| UI | React Native |
| Language | TypeScript |
| Routing | Expo Router |
| Styling | NativeWind or an appropriate React Native styling solution |
| Server state | TanStack Query |
| Client state | Zustand, if needed |
| Forms | React Hook Form |
| Validation | Zod |
| API | Shared existing API client where compatible |
| Secure storage | Expo SecureStore |
| Local database | Expo SQLite |
| Animations | React Native Reanimated |
| Gestures | React Native Gesture Handler |
| Lists | FlashList where beneficial |
| Icons | Consistent icon library |
| Testing | Jest and React Native Testing Library |
| E2E testing | Maestro |

Use compatible stable versions for the existing Expo SDK and React Native ecosystem.

Do not blindly install the latest versions of every package. Verify peer dependencies and compatibility.

Avoid installing unnecessary dependencies.

## 5. Existing Application and Functionality Audit

Create a complete inventory of the existing application before implementation.

For every existing route, page, major component and user workflow, document:

- Name
- Purpose
- User role
- Existing web route
- Required functionality
- Data dependencies
- API dependencies
- Interactive behavior
- Mobile implementation status

Create a feature parity matrix.

Example:

| Feature | Web | Android | Status |
|---|---|---|---|
| Authentication | Yes | Required | Pending |
| Dashboard | Yes | Required | Pending |
| Trainee management | Yes | Required | Pending |
| Workout plans | Yes | Required | Pending |
| Workout builder | Yes | Required | Pending |
| Exercise database | Yes | Required | Pending |
| Workout execution | Yes | Required | Pending |
| Progress tracking | Yes | Required | Pending |
| Profile settings | Yes | Required | Pending |

The final matrix must include the actual features discovered in the repository, not just this example.

The application must support all relevant user roles and their corresponding permissions.

Do not accidentally show organization-only functionality to coaches or trainee-only functionality to managers.

## 6. Design System Preservation

The Android application must follow the existing Gym-Plan design system.

Inspect and reproduce:

- Brand colors
- Semantic colors
- Typography
- Font weights
- Persian fonts and typography
- RTL layout behavior
- Spacing system
- Border radiuses
- Shadows and elevations
- Card styles
- Input styles
- Button variants
- Icon styles
- Empty states
- Loading states
- Error states
- Dialogs and bottom sheets
- Navigation conventions
- Light/dark mode if supported

Create a centralized native theme.

For example:

```text
apps/mobile/theme/
├── colors.ts
├── typography.ts
├── spacing.ts
├── radius.ts
├── shadows.ts
├── tokens.ts
└── index.ts
```

Do not scatter hardcoded styling values throughout the application.

Use the same design tokens as the web application wherever practical.

### Visual fidelity requirements

The Android application should look recognizably like Gym-Plan.

Preserve the existing:

- Visual hierarchy
- Content organization
- Card appearance
- Information density where appropriate
- Button appearance
- Iconography
- Typography
- Color relationships
- General layout patterns

Do not redesign the product without explicit approval.

Native adaptations are allowed when required for Android usability, accessibility or platform conventions.

## 7. Component-by-Component Migration

This is one of the most important parts of the task.

Inspect every existing reusable web component.

For each component:

1. Understand its purpose.
2. Identify its props and variants.
3. Understand its state and interactions.
4. Identify its dependencies.
5. Understand its responsive behavior.
6. Identify its accessibility requirements.
7. Determine whether its logic can be shared.
8. Implement an equivalent native component.
9. Verify the component's behavior.
10. Verify its visual appearance.

Create native equivalents for components such as:

- Buttons
- Inputs
- Selects
- Dropdowns
- Cards
- Badges
- Modals
- Dialogs
- Bottom sheets
- Tabs
- Navigation menus
- Search fields
- Tables and data lists
- Empty states
- Loading skeletons
- Toasts
- Tooltips where appropriate
- Date pickers
- Time pickers
- Progress indicators
- Charts
- Exercise cards
- Workout cards
- Trainee cards
- Form elements

Use native equivalents rather than trying to render HTML elements inside React Native.

Do not assume that because a component renders, it is implemented correctly.

Verify:

- All props work.
- All variants work.
- All callbacks work.
- Disabled states work.
- Loading states work.
- Validation states work.
- Accessibility labels are present.
- Touch targets are sufficiently large.
- Components work with RTL.
- Components work on different screen sizes.

Maintain a component migration checklist.

## 8. Screen and Workflow Implementation

Recreate every important existing web screen in Android.

Do not only build the dashboard and a few sample screens.

Follow the actual application navigation and user permissions.

Ensure:

- All existing workflows are accessible.
- All buttons have functional actions.
- Forms submit correctly.
- Navigation works.
- Back navigation works.
- Search and filtering work.
- Pagination or infinite scrolling works where applicable.
- Data updates correctly.
- Error handling is implemented.
- Loading states are implemented.
- Empty states are implemented.
- Authentication and session expiration work correctly.

Preserve the existing backend API contracts and business rules.

## 9. Android Responsive Design

The application must work correctly across different Android devices.

Do not optimize for only one emulator or one screen size.

Consider:

- Small Android phones.
- Standard Android phones.
- Large Android phones.
- Foldable devices where practical.
- Tablets.
- Different pixel densities.
- Different screen aspect ratios.
- Portrait and landscape orientations where appropriate.
- System font scaling.
- Android navigation modes.
- Status bar and navigation bar insets.
- Keyboard appearance and dismissal.
- Safe area handling.

Implement responsive layouts using React Native layout primitives.

Use:

- Flexbox.
- ScrollView where appropriate.
- FlatList or FlashList for large lists.
- Dimensions and useWindowDimensions where necessary.
- Safe area insets.
- Responsive spacing and typography.
- Flexible containers rather than fixed widths.

Avoid:

- Hardcoded screen widths.
- Hardcoded absolute positioning for normal layouts.
- Fixed heights that break with different screen sizes.
- Content hidden behind system navigation bars.
- Horizontal overflow.
- Keyboard covering form fields.
- Text clipping.
- Unnecessary nested scrolling.

Test at minimum on these representative viewport sizes:

| Device category | Approximate viewport |
|---|---|
| Small phone | 320–360 dp |
| Standard phone | 360–393 dp |
| Large phone | 400–440 dp |
| Tablet | 600–840 dp |

These are testing targets, not hardcoded layout breakpoints.

## 10. Persian Language and RTL

Gym-Plan is a Persian application.

RTL correctness is mandatory.

Verify:

- Right-to-left layout.
- Persian text rendering.
- Persian font support.
- Number formatting.
- Date formatting.
- Jalali calendar compatibility where applicable.
- Mixed Persian and English text.
- Text alignment.
- Icons and directional arrows.
- Navigation transitions.
- Form fields.
- Numeric inputs.
- Lists and cards.
- Charts and data visualization.

Do not simply reverse the entire interface.

Use React Native's RTL capabilities correctly and test actual Android rendering.

Ensure that icons representing physical actions, such as play, pause and directional movement, are not incorrectly mirrored.

## 11. Native Android Best Practices

Build a proper Android application rather than a website inside a WebView.

Implement:

- Correct Android application configuration.
- Application name and package identifier.
- Application icon and adaptive icon.
- Splash screen.
- Status bar styling.
- Navigation bar styling.
- Android back button behavior.
- Keyboard handling.
- Permission management.
- Deep linking where required.
- Secure authentication storage.
- Appropriate error handling.
- Network state handling.
- App lifecycle handling.

Use Expo-supported native APIs.

Do not introduce unnecessary native dependencies.

Do not request permissions without a real product requirement.

## 12. Performance

The application should remain responsive on ordinary Android devices.

Pay particular attention to:

- Large trainee lists.
- Exercise databases.
- Workout history.
- Search results.
- Charts.
- Images.
- Complex forms.
- Workout execution screens.

Use appropriate list virtualization.

Avoid unnecessary re-renders.

Avoid excessive global state.

Optimize image sizes and caching.

Use React Native performance profiling tools where necessary.

Do not sacrifice maintainability for premature optimization.

## 13. Offline Capabilities

Evaluate offline support for important trainee workflows.

At minimum, investigate:

- Downloading assigned workout plans.
- Local workout session storage.
- Logging sets and repetitions offline.
- Persistent local data.
- Synchronization when internet connectivity returns.
- Duplicate submission prevention.
- Conflict detection.

Use Expo SQLite or another appropriate local storage solution.

Do not assume the existing web PWA's IndexedDB implementation can be reused directly in React Native.

Keep the offline domain logic reusable where possible, but implement platform-specific persistence adapters.

## 14. Authentication and Security

Inspect the existing authentication architecture.

Implement the native equivalent without compromising security.

Requirements:

- Secure token storage.
- Correct session handling.
- Session expiration.
- Refresh token handling where applicable.
- Logout behavior.
- User-role authorization.
- Protected navigation.
- No secrets embedded in the application bundle.
- No reliance on client-side role checks as the only authorization mechanism.

Keep backend authorization authoritative.

## 15. Testing and Verification

Testing is mandatory.

Do not consider the application complete merely because it compiles.

### A. Static checks

Run:

- TypeScript checks.
- ESLint.
- Formatting checks.
- Dependency compatibility checks.
- Import and circular dependency checks.

### B. Component tests

Test all important shared and native UI components.

Verify:

- Rendering.
- Props.
- Interactions.
- Variants.
- Error states.
- Accessibility.

### C. Workflow tests

Test complete user workflows, including:

- Login.
- Registration where supported.
- Role-specific navigation.
- Trainee management.
- Workout plan creation.
- Exercise selection.
- Workout execution.
- Set logging.
- Editing and deleting records.
- Logout.

### D. Device tests

Test using Android emulators and, where possible, physical devices.

Test at different viewport sizes.

Test:

- Keyboard behavior.
- RTL.
- Scrolling.
- Android back button.
- Network failures.
- Application backgrounding and resuming.
- Screen rotation where supported.
- Large font sizes.

### E. Visual verification

Compare the existing web application and Android application screen by screen.

The goal is to maintain visual consistency, not necessarily identical pixel output because native rendering differs from browser rendering.

For every important screen, inspect:

- Spacing.
- Alignment.
- Typography.
- Colors.
- Card proportions.
- Component sizing.
- Visual hierarchy.
- Content visibility.

Fix visible inconsistencies before declaring completion.

## 16. Documentation

Create and maintain:

- Android architecture documentation.
- Setup instructions.
- Development instructions.
- Build instructions.
- Environment configuration.
- Shared package documentation.
- Component migration checklist.
- Feature parity matrix.
- Testing instructions.
- Known limitations.

Document all architectural decisions.

## 17. Build and Delivery

The final application must be buildable as an Android application.

Configure Expo EAS Build or an appropriate local Android build process.

Deliver:

1. A working Expo application inside the existing repository.
2. A successful Android development build.
3. A production Android AAB build configuration suitable for Google Play.
4. A debug APK build option for direct device testing.
5. Complete setup and build documentation.
6. A list of implemented features.
7. A list of incomplete features, if any.
8. Test results.
9. A visual verification report.
10. Known limitations.

Do not claim that a build or test passed unless it was actually executed successfully.

## 18. Implementation Strategy

Work incrementally.

### Phase 1: Repository and architecture audit
Inspect the existing application and document the migration plan.

### Phase 2: Monorepo preparation
Introduce the workspace architecture carefully without breaking the existing web application.

### Phase 3: Shared packages
Extract reusable types, schemas, API contracts and business logic.

### Phase 4: Expo foundation
Set up Expo, navigation, theme, fonts, RTL and native configuration.

### Phase 5: Design system
Implement and verify the native component library.

### Phase 6: Application screens
Implement all existing screens and user workflows.

### Phase 7: Offline and native functionality
Implement the appropriate offline capabilities and native integrations.

### Phase 8: Testing and visual verification
Run comprehensive tests and correct issues.

### Phase 9: Production build
Generate and verify the Android application build.

At the end of each phase:

- Run relevant checks.
- Fix regressions.
- Update documentation.
- Update the migration checklist.
- Report completed and remaining work.

Do not skip phases to produce a superficially complete application.

## 19. Definition of Done

The project is complete only when:

- The original Next.js application still works.
- The Expo application builds successfully.
- Existing important features have native equivalents.
- All relevant user roles are supported.
- Authentication works.
- API integrations work.
- The visual identity matches the web application.
- Persian RTL works correctly.
- The application adapts to different Android screen sizes.
- Important interactions work.
- No critical UI components remain unimplemented.
- Automated tests pass.
- Major workflows have been verified on Android.
- The production Android build configuration is ready.
- Documentation is complete.

**Final instruction:** Prioritize correctness, feature parity, visual consistency, maintainability and native Android quality over implementation speed. Do not redesign, simplify or remove existing product functionality without documenting the reason and obtaining approval.