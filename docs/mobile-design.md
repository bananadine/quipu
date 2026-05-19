# Part 2 - Mobile (Design)

## Goal

Bring Android and iOS test coverage into the existing Playwright + TypeScript framework so that a developer adding a region, fixing a backend regression, or updating a test data fixture sees a single, coherent test ecosystem - not three siloed ones.

Mobile is the layer where it's easiest to fork into a parallel framework by accident (different language, different runner, different CI). The design here keeps it from happening.

---

## Architecture - what plugs in where

```
packages/
├── core/        @quipu/core      [unchanged]   region config, schemas, logger
├── api/         @quipu/api       [unchanged]   ParaBankClient, fixtures, API tests
├── web/         @quipu/web       [unchanged]   page objects, fixtures, web tests
└── mobile/      @quipu/mobile    [NEW]         Appium driver + screen objects + fixtures
    ├── src/
    │   ├── drivers/                            session bootstrap per platform
    │   │   ├── android.driver.ts
    │   │   └── ios.driver.ts
    │   ├── screens/                            Screen Object Model (parallel to POM)
    │   │   ├── base.screen.ts
    │   │   ├── login.screen.android.ts
    │   │   ├── login.screen.ios.ts
    │   │   └── overview.screen.ts              shared when locator strategy converges
    │   └── fixtures/
    │       └── mobile.fixtures.ts              Playwright test-runner extension
    └── tests/
        ├── login.spec.ts                       cross-platform via fixture projects
        └── transfer.spec.ts
```

Three packages stay exactly as they are; mobile is purely additive. `@quipu/mobile` depends on `@quipu/core` and `@quipu/api`, never the other way round.

---

## Why Playwright as the runner for mobile

Appium has its own test runners (WebdriverIO, JUnit, Pytest), but using them would mean two runners, two reporters, two CI integrations, two skill sets. By keeping **Playwright's test runner** as the harness and using **Appium as the driver underneath**, the team gets:

- One fixture API (`test.extend<...>`) across every layer.
- One reporter set (HTML + JUnit), one trace viewer, one artifact pipeline.
- The same region-resolution pattern - `loadRegion()` from `@quipu/core` works unchanged inside mobile fixtures.

The bridge is the `webdriverio` client (or `appium` Node SDK) instantiated inside a Playwright fixture. The fixture exposes a typed `driver` to the test, much like the existing web fixture exposes `page`.

---

## Fixture sketch

```ts
// packages/mobile/src/fixtures/mobile.fixtures.ts
import { test as base } from "@playwright/test";
import { loadRegion, type RegionConfig } from "@quipu/core";
import { ParaBankClient } from "@quipu/api";
import { remote, type Browser } from "webdriverio";
import { androidCaps, iosCaps } from "../drivers/index.js";

type Platform = "android" | "ios";

export const test = base.extend<{
  region: RegionConfig;
  platform: Platform;
  driver: Browser;
  apiClient: ParaBankClient;
}>({
  region: [async ({}, use) => { await use(loadRegion()); }, { scope: "worker" }],
  platform: [
    async ({}, use) => {
      const p = (process.env.MOBILE_PLATFORM ?? "android") as Platform;
      await use(p);
    },
    { scope: "worker" },
  ],
  driver: async ({ platform, region }, use) => {
    const caps = platform === "android" ? androidCaps(region) : iosCaps(region);
    const driver = await remote({ /* server config */, capabilities: caps });
    await use(driver);
    await driver.deleteSession();
  },
  apiClient: async ({ region, request }, use) => {
    await use(new ParaBankClient(request, region));
  },
});
```

The shape mirrors `web.fixtures.ts` deliberately. A test author who already wrote web tests can write mobile tests with no new mental model:

```ts
test("happy: login on Android lands on overview", async ({ driver, region }) => {
  const login = new LoginScreen(driver, region, "android");
  await login.goto();
  await login.loginAs(region.testData.primaryUser);
  expect(await new OverviewScreen(driver).isVisible()).toBe(true);
});
```

---

## Screen Object Model - the same pattern, two backends

Mobile uses a **Screen Object Model** that mirrors the web layer's POM. The only differences:

- Locator strategies are platform-aware. Android uses `~accessibilityId` (resource-id under the hood), iOS uses `~accessibilityId` (label) or `-ios predicate string`.
- For screens whose locator strategy is identical across platforms (a single React Native app, say), one `.ts` file serves both. For native apps with divergent ID schemes, we split into `.android.ts` / `.ios.ts` siblings, both implementing a common interface.

```ts
// base.screen.ts - platform-agnostic surface
export interface LoginScreenContract {
  goto(): Promise<void>;
  loginAs(user: TestUser): Promise<void>;
  errorText(): Promise<string | null>;
}
```

Tests interact with the contract; the fixture wires up the right implementation. This is the same separation `base.page.ts` already enforces on the web side.

---

## Region awareness - works for free

Mobile inherits region awareness without any new code:

- `loadRegion()` resolves the active region from `REGION` exactly as web/API does.
- The mobile driver gets the region's `locale` and `timezoneId` passed to it via Appium capabilities (`appium:locale`, `appium:tz`), so the app under test renders region-appropriate dates and currency strings.
- API-driven setup (creating a payee, seeding a transfer) uses the same `ParaBankClient` - no parallel SDK.

To add a new region for mobile, you do nothing in `@quipu/mobile`; the new entry in `@quipu/core` is automatically picked up.

---

## CI integration

Add a fourth workflow, `mobile-tests.yml`, sharing the same shape:

```yaml
strategy:
  matrix:
    region: [us, eu, uk]
    platform: [android, ios]
runs-on: ${{ matrix.platform == 'ios' && 'macos-latest' || 'ubuntu-latest' }}
```

Android runs on `ubuntu-latest` with `reactivecircus/android-emulator-runner`. iOS runs on `macos-latest` with `xcrun simctl` and an Appium service.

For cloud device labs (BrowserStack, Sauce Labs), the only change is the Appium server URL and capability set - the test code is unchanged.

`all-tests.yml` gains a `mobile` job mirroring `api` and `web`. The trigger model (manual dispatch with region pick, nightly cron) is identical.

---

## What this delivers

- **One framework, three layers.** Test authors move between API, web, and mobile without re-learning the runner or fixture model.
- **Zero duplication of the API surface.** Mobile tests use `ParaBankClient` directly - schema validation, retries, tracing all apply automatically.
- **Region expansion still costs one file.** Adding APAC to mobile is the same single-file change that adds APAC to API and web: `packages/core/src/config/regions/apac.ts`.
- **CI artifacts are unified.** One HTML report style, one JUnit XML format, one trace viewer across every layer.
