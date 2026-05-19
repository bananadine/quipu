# CI/CD Pipeline Guide

Quipu uses **GitHub Actions** to run layers independently or together. The pipeline supports multiple regions and comprehensive reporting.

## Workflows

### 1. **API Tests** (`api-tests.yml`)
Tests the `@quipu/api` module and its dependencies (`@quipu/core`).

**Triggers:**
- Push/PR to `main` (changes in `modules/api/**`, `modules/core/**`, or workflow file)
- Manual dispatch: Select region (us, eu, uk, or all)
- Nightly schedule: 03:30 UTC daily

**Matrix:** Runs against all three regions unless overridden via manual dispatch

**Artifacts:**
- `api-report-{region}`: Playwright HTML report
- `api-junit-{region}`: Test results in JUnit format

### 2. **Web Tests** (`web-tests.yml`)
Tests the `@quipu/web` module and its dependencies (`@quipu/api`, `@quipu/core`).

**Triggers:**
- Push/PR to `main` (changes in `modules/web/**`, `modules/api/**`, `modules/core/**`, or workflow file)
- Manual dispatch: Select region (us, eu, uk, or all)

**Matrix:** Runs against all three regions unless overridden via manual dispatch

**Artifacts:**
- `web-report-{region}`: Playwright HTML report
- `web-junit-{region}`: Test results in JUnit format

### 3. **All Tests** (`all-tests.yml`)
Runs both API and Web tests in sequence. API runs first to catch backend issues early before spinning up browsers.

**Triggers:**
- Manual dispatch: Select region (us, eu, uk, or all)
- Nightly schedule: 02:00 UTC daily

**Dependencies:** Web tests wait for API tests to complete

**Artifacts:**
- `all-api-report-{region}`: Playwright HTML report for API
- `all-api-junit-{region}`: JUnit results for API
- `all-web-report-{region}`: Playwright HTML report for Web
- `all-web-junit-{region}`: JUnit results for Web

## Running Tests Locally

### Run a specific layer
```bash
npm run test:api      # Test API layer only
npm run test:web      # Test Web layer only
```

### Run all layers
```bash
npm run test:all      # Runs both API and Web tests
```

### Type-check without testing
```bash
npm run typecheck
```

### Build project references
```bash
npm run build
```

## Independent vs. Together

The pipeline design supports both patterns:

**Independent Execution:**
- `api-tests.yml` runs standalone on API changes
- `web-tests.yml` runs standalone on Web changes
- Each layer tests its own module + dependencies
- Fast feedback on specific layer changes

**Together Execution:**
- `all-tests.yml` runs both layers sequentially
- Web waits for API to complete (dependency: `needs: [matrix-setup, api]`)
- Ensures end-to-end coverage
- Used as the "ship gate" before merging

## Region Matrix

All workflows support multi-region testing:
- **us**: United States region
- **eu**: Europe region
- **uk**: United Kingdom region
- **all**: Run against all three regions

Default behavior (automatic triggers): Run all three regions
Manual dispatch: Choose a specific region or "all"

## Artifact Retention

All artifacts retained for **14 days**, enabling:
- Historical comparison of test results
- Debugging of failed runs
- Performance trend analysis

## Path Triggers

Workflows only run when relevant files change:

**api-tests.yml:**
- `modules/api/**`
- `modules/core/**`
- `.github/workflows/api-tests.yml`
- `package.json`

**web-tests.yml:**
- `modules/web/**`
- `modules/api/**`
- `modules/core/**`
- `.github/workflows/web-tests.yml`
- `package.json`

## Environment Variables

Both test runs use:
- `REGION`: Set to the matrix region value
- `CI: true`: Indicates tests are running in CI environment

## Project Structure

The pipeline respects the monorepo structure:
```
modules/
├── core/          # Base utilities, shared types
├── api/           # API layer tests
└── web/           # Web layer tests
```

Dependencies flow: `web` → `api` → `core`

## Troubleshooting

**Tests not running on my push?**
- Check if files changed match the workflow's path triggers
- Workflows only run on `main` branch by default
- For manual testing, use workflow dispatch

**Web tests failing but API passing?**
- Check if `@quipu/api` or `@quipu/core` had breaking changes
- Web depends on both; API changes may require Web test updates

**Region-specific failures?**
- Use manual dispatch to test a specific region in isolation
- Check region-specific environment configuration

**Artifacts not uploading?**
- Verify Playwright reports are being generated to the expected paths
- Check if tests are actually running (may skip if earlier steps fail)
