# Quipu - Multi-Region Playwright Test Framework

A Playwright + TypeScript test framework for a multi-region financial services product. API and Web layers are independently runnable, share infrastructure where it helps, and switch regions with a single environment variable - no test code changes.

Target system: [ParaBank](https://parabank.parasoft.com/parabank/index.htm), a Parasoft-hosted banking demo with both a web UI and a REST API. ParaBank was chosen for genuine domain fit (accounts, transfers, transactions) over generic e-commerce demos.

---

## At a glance

```
quipu/
├── packages/
│   ├── core/    @quipu/core   shared: region config, schema, logger
│   ├── api/     @quipu/api    Playwright API tests + reusable client
│   └── web/     @quipu/web    Playwright UI tests + page objects
├── .github/workflows/         CI: api-tests, web-tests, all-tests
└── docs/mobile-design.md      Part 2 - how mobile slots into this
```

Three regions ship out of the box: **us**, **eu**, **uk** - each with its own base URLs, currency, locale, timezone, test data, feature flags, and timeout profile. Adding a region is a single file under `packages/core/src/config/regions/`.

**Note on regions and the target app:** ParaBank itself is a single shared public demo - it has no regional deployments. All three region configs currently point at the same URL. The region layer exists to demonstrate the framework pattern: in a real product each region would point at a separate cluster, and the tests would run unchanged. Here it lets you vary locale, timeout profile, and test credentials without touching test code.

---

## Architectural choices, briefly

1. **Region as a first-class type.** Every test pulls from a `RegionConfig` resolved at start-of-run from `REGION`. Zod validates the schema so misconfigured regions fail loudly at startup instead of mysteriously at test time. URLs, credentials, currency, locale, feature flags and timeouts are all region-scoped.
2. **API client is shared between layers.** `ParaBankClient` lives in `@quipu/api` and is imported by web fixtures as well - so web tests can drive API setup or verify state through a typed surface, not ad-hoc `fetch` calls. One implementation, two consumers.
3. **Independent runnability via npm workspaces.** `npm run test:api` and `npm run test:web` are separate entry points with separate Playwright configs. The same `REGION` variable drives both, but neither depends on the other to run.
4. **Schema validation as a first-class test type.** Zod schemas live next to the client and are exercised by `schema-validation.spec.ts`. Upstream contract drift produces a precise diff, not a downstream NullPointer.
5. **Page Object Model for the web layer.** Selectors don't leak into specs - every interaction goes through a page object method. Keeps tests readable and the inevitable selector churn contained.
6. **CI parameterised by a region matrix.** `workflow_dispatch` lets you pick a region (or `all`); scheduled runs hit every region nightly so cross-region drift surfaces before it ships.

---

## Prerequisites

- Node.js 20+ (`.nvmrc` pins to 20)
- npm 10+

---

## Local setup

```bash
# 1. Install dependencies (uses npm workspaces)
npm install

# 2. Install Playwright browsers (Chromium only, by default)
npm run install:browsers

# 3. Build TypeScript project references (core → api → web)
npm run build
```

---

## Running tests

The active region is selected by the `REGION` env var. Default is `us`.

```bash
# API layer only - current region (defaults to us)
npm run test:api

# Web layer only
npm run test:web

# Both layers, sequentially
npm run test:all

# Switch region - same tests, different deployment target
REGION=eu npm run test:api
REGION=uk npm run test:web

# Headed browser run (for debugging web tests)
npm run test:headed --workspace @quipu/web

# Playwright UI mode (web)
npm run test:ui --workspace @quipu/web
```

After a run, HTML reports live at:
- `packages/api/playwright-report/<region>/index.html`
- `packages/web/playwright-report/<region>/index.html`

Open them with `npm run report --workspace @quipu/api` or `--workspace @quipu/web`.

---

## What's covered

### API layer (`packages/api/tests/`)

| Spec | Type | Notes |
|---|---|---|
| `auth.spec.ts` | happy + error | Valid login establishes session; invalid creds rejected |
| `accounts.spec.ts` | happy + error | Customer has accounts; unknown account returns error |
| `transfers.spec.ts` | happy + error + idempotency + edge | Transfer succeeds; zero-amount error case; explicit non-idempotency contract; transfer to itself edge  |
| `schema-validation.spec.ts` | schema | Zod-validates customer, accounts, single account, transactions |

### Web layer (`packages/web/tests/`)

| Spec | Type | Notes |
|---|---|---|
| `login.spec.ts` | happy + error | Valid creds reach overview; invalid surface inline error |
| `transfer.spec.ts` | happy + idempotency + error | UI transfer verified via API transaction history; double-click documents ParaBank's non-idempotent submit (two distinct debits created); non-numeric input rejected client-side; |
| `api-setup-transfer.spec.ts` | cross-layer | API-driven transfer; UI verifies the resulting state |

The transfer happy-path and the api-setup test both demonstrate the cross-layer pattern: API client is used for setup *and* verification of state changes made through the UI.

---

## Adding a new region

```bash
# 1. Create the region file
cp packages/core/src/config/regions/us.ts packages/core/src/config/regions/apac.ts
# 2. Edit it - set id, displayName, base URLs, currency, locale, test data
# 3. Register it
```

Edit `packages/core/src/config/loader.ts`:

```ts
import { apac } from "./regions/apac.js";
// ...
const REGIONS: Record<RegionId, RegionConfig> = { us, eu, uk, apac };
```

And widen the `RegionIdSchema` enum in `packages/core/src/config/schema.ts` to include `"apac"`. That's it - every test runs against the new region with `REGION=apac`.

---

## Troubleshooting

### All tests fail with `accounts.length = 0` (or timeouts waiting for account rows)

The ParaBank demo is a shared public environment. Its admin "Data Access Mode" can be changed by anyone, which breaks the `services_proxy/bank` REST endpoint that the tests rely on — it silently returns `[]` instead of an error.

**Fix** - reset the data access mode to JDBC in one command:

```bash
curl -sc /tmp/pb.txt "https://parabank.parasoft.com/parabank/login.htm" -d "username=john&password=demo" && curl -sb /tmp/pb.txt "https://parabank.parasoft.com/parabank/admin.htm" -d "accessMode=jdbc" -o /dev/null -w "Done: %{http_code}\n"
```

Should print `Done: 200`. Re-run tests after.

You can verify it worked: `curl -sb /tmp/pb.txt "https://parabank.parasoft.com/parabank/services_proxy/bank/customers/12212/accounts" -H "Accept: application/json"` should return a non-empty array.

You can also do the same on ParaBank admin page: https://parabank.parasoft.com/parabank/admin.htm

---

## CI

Three workflows in `.github/workflows/`:

- **api-tests.yml** - runs API tests across all regions on push/PR; manual dispatch lets you pick one
- **web-tests.yml** - same shape, web layer
- **all-tests.yml** - orchestrates both layers (API first, then Web) with a region matrix; nightly cron at 02:00 UTC

Each workflow uploads the Playwright HTML report and JUnit XML as artifacts, scoped per region.

---

## Part 2 - Mobile

The optional mobile design doc is in [`docs/mobile-design.md`](docs/mobile-design.md). Short version: Android/iOS tests reuse `@quipu/core` (region config) and `@quipu/api` (client) unchanged; an Appium-driven `@quipu/mobile` package adds platform-specific page objects against the same fixture pattern.
