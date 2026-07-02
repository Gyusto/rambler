# End-to-End Tests (Playwright)

Smoke tests that exercise the Rambler web UI through a real browser.

## Prerequisites

1. Install the JS dependencies (adds `@playwright/test`):

   ```bash
   npm install
   ```

2. Install the Chromium browser Playwright drives:

   ```bash
   npx playwright install chromium
   ```

3. The app must be running and reachable. By default the tests target
   **http://localhost:5001** (the Docker container). To point at a different
   host, set `E2E_BASE_URL`:

   ```bash
   export E2E_BASE_URL=http://localhost:5001
   ```

## Running

```bash
# Headless run of all specs
npm run test:e2e

# Interactive UI mode (watch, inspect, time-travel)
npm run test:e2e:ui
```

## What's covered

`smoke.spec.ts`:

- **Landing loads** — `/` shows the "Where conversations" hero and links to
  `github.com/8labs/rambler`.
- **Terms page** — `/tos` renders "Terms of Service".
- **Guest login → chat** — from `/login`, pick a unique nickname, click
  **Guest**, and confirm we land on `/chat` with the "Just ramble away…"
  composer visible.

Tests use accessible/text selectors (`getByRole`, `getByPlaceholder`,
`getByText`) rather than brittle CSS.
