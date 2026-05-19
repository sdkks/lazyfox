# LazyFox

LazyFox is a lightweight, open-source tab suspender that automatically puts inactive tabs to sleep. It saves CPU, GPU, and memory by freeing resources consumed by tabs you are not actively using.

## Features

- **Automatic tab sleeping** -- sleeps inactive tabs after a configurable timeout
- **Two sleep modes** -- Full Sleep (replaces tab with a lightweight sleeping page) and Discard (uses browser-native tab discarding)
- **Amphetamine Shots** -- temporarily keep specific tabs awake beyond the sleep timeout
- **Den (protected tabs)** -- protect important domains from ever being slept
- **Dark-themed UI** -- popup and sleeping page styled with a clean dark palette
- **Privacy-first** -- no tracking, no ads, no data collection. Runs entirely on-device
- **Cross-browser** -- works on Chrome and Firefox (Manifest V3)

## Installation

### Chrome Web Store

Install from the [Chrome Web Store](#) (link coming soon).

### Firefox Add-ons

Install from [Firefox Add-ons](#) (link coming soon).

### Development Build

```bash
git clone https://github.com/tabber/lazyfox.git
cd lazyfox

# Install dependencies
pnpm install

# Start dev mode (Chrome)
pnpm dev

# Start dev mode (Firefox)
pnpm dev:firefox

# Production build
pnpm build          # Chrome
pnpm build:firefox  # Firefox

# Create distribution ZIPs
pnpm zip
pnpm zip:firefox
```

## Usage

1. Click the LazyFox icon in your browser toolbar to open the popup.
2. Configure your sleep timeout, mode, and protected domains (Den).
3. Tabs inactive longer than the timeout will automatically be put to sleep.
4. Use "Sleep This Tab" or "Sleep All" to sleep tabs immediately.
5. Give tabs an "Amphetamine Shot" to keep them awake temporarily.
6. Sleeping tabs show a lightweight page with a "Wake Up" button to restore them.

## Development

### Tech Stack

- [WXT](https://wxt.dev) -- framework for cross-browser extension development
- [TypeScript](https://www.typescriptlang.org/) -- strict mode
- Manifest V3
- Vitest for testing
- ESLint + Prettier for code quality

### Project Structure

```
src/
  entrypoints/
    background.ts      # Service worker (alarms, message routing, tab sleep/wake)
    popup/             # Popup UI (settings, controls, den management)
    sleeping/          # Sleeping page (shown when a tab is put to sleep)
  types/
    index.ts           # Shared type definitions and message contracts
  utils/
    alarms.ts          # Alarm scheduling helpers
    logger.ts          # Namespaced logger
    storage.ts         # WXT storage wrappers
    tabEligibility.ts  # Tab sleep eligibility checks
  config.ts            # Configuration defaults and types
public/
  icons/               # Extension icons (16-128px)
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev mode for Chrome |
| `pnpm dev:firefox` | Start dev mode for Firefox |
| `pnpm build` | Production build for Chrome |
| `pnpm build:firefox` | Production build for Firefox |
| `pnpm zip` | Create Chrome distribution ZIP |
| `pnpm zip:firefox` | Create Firefox distribution ZIP |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Run Prettier |
| `pnpm test` | Run Vitest test suite |

## License

MIT
