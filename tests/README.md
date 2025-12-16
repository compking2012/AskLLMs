# AskLLMs Extension E2E Tests

This folder contains an **automated end-to-end (E2E)** test program for the AskLLMs Chrome extension.

It launches Chromium, loads the unpacked extension from the project root, opens `popup.html`, and then
automatically verifies the extension’s existing features (i18n, theme, settings persistence, platform
visibility/order, platform selection including drag-select, toggles, history, progress UI, and **send flow**).

The send flow supports two modes:
- **real**: open real AI websites and send (requires you to login in a persistent profile)
- **mock**: do not open external sites; simulate completion via `chrome.storage`

## Prerequisites

- Node.js 18+
- npm

## Install

```bash
cd tests
npm install
npm run pw:install
```

## Run

```bash
cd tests
npm test
```

### Real send mode (default)

By default, the test runs in **real mode** (`--mode real`): it will open the real AI websites and try to send
the query using the extension logic.

**Important prerequisite**: you must be logged in to the target platforms inside the Chromium profile used by
the test. The easiest way is to provide a persistent profile directory:

```bash
cd tests
npm test -- --mode real --userDataDir /path/to/askllms-e2e-profile --platforms ChatGPT
```

Run it once, Chromium will open, then manually login to the target platforms in that profile. Re-run the test
and it can send automatically.

### Real send case matrix

The real send step is **case-matrix driven**.

Useful arguments:

- `--suite smoke|full|allPairs`:
  - `smoke`: small set
  - `full` (default): covers all selected platforms + representative multi-platform combinations
  - `allPairs`: covers **all pairs** of the selected platforms (can be very slow)
- `--toggleMatrixSingle off|each|all` (default: `each`)
- `--toggleMatrixMulti off|offAllOn|each|all` (default: `offAllOn`)
- `--platforms <comma-separated>`: e.g. `ChatGPT,Claude,Gemini` or `all`
- `--maxCases <N>`: cap total send cases (for quick runs)
- `--continueOnError`: keep running and report failures at the end

Examples:

```bash
cd tests
# Full suite for ChatGPT only, with all 16 toggle combinations
npm test -- --mode real --userDataDir /path/to/profile --platforms ChatGPT --toggleMatrixSingle all --suite full
```

```bash
cd tests
# Full suite for multiple platforms, but cap at 20 cases
npm test -- --mode real --userDataDir /path/to/profile --platforms ChatGPT,Claude,Gemini --maxCases 20
```

### Mock mode (stable / CI)

Use `--mode mock` to avoid external websites. The “send” flow is simulated via `chrome.storage` progress data.

```bash
cd tests
npm test -- --mode mock
```

## Debug mode

```bash
cd tests
npm run test:debug
```


