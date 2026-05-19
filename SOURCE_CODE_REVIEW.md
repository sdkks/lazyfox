# Source Code Review -- LazyFox

This document is for Firefox Add-on reviewers. It explains how to build the extension from source and what the build process produces.

## Build Instructions

### Prerequisites

- Node.js 22 or later
- pnpm (package manager)

### Reproducible Build

```bash
pnpm install
pnpm build:firefox
```

The built and packaged extension will be in `.output/`.

The build is deterministic given the same `pnpm-lock.yaml` and Node.js version. WXT (the build framework) uses Vite under the hood, which produces consistent output for the same input source.

### Output Structure

After `pnpm build:firefox`, the `.output/` directory contains:

- `firefox-mv3/` -- the unpacked extension directory
- `lazyfox-1.0.0-firefox.zip` -- the packaged extension (for submission)

## Source Code vs Built Code

### What Is in This Repository

All source code in this repository is human-readable, unminified, and un-obfuscated:

- `src/` -- TypeScript source files (strict mode, ES modules)
- `public/` -- Static assets (icons in PNG format, generated from `public/icons/icon-source.svg`)
- Configuration files at the repository root (`wxt.config.ts`, `package.json`, `tsconfig.json`, etc.)

### What the Build Process Does

The `pnpm build:firefox` command:

1. Compiles TypeScript to JavaScript (via Vite/esbuild)
2. Bundles the extension into a Firefox-compatible Manifest V3 package
3. Copies static assets (icons, HTML) into the output

No code is minified or obfuscated during the build process. The generated JavaScript is readable and maps directly to the TypeScript source.

### No Obfuscation or Minification

We do not use any obfuscation or minification tools. The built JavaScript maintains the same structure, naming, and readability as the source TypeScript.

## Third-Party Dependencies

All dependencies are installed via `pnpm install` from the npm registry and are listed in `package.json`:

### Runtime Dependencies

LazyFox has **no runtime dependencies**. The extension uses only browser APIs available in Manifest V3 (`storage`, `tabs`, `alarms`).

### Development Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| wxt | Cross-browser extension framework | ^0.20.0 |
| typescript | Type checking and compilation | ~5.8.0 |
| vitest | Test runner | ^3.0.0 |
| eslint | Code linting | ^9.0.0 |
| prettier | Code formatting | ^3.0.0 |
| @webext-core/fake-browser | Browser API mocking for tests | ^1.3.0 |

All dependencies have permissive open-source licenses (MIT, Apache-2.0, or equivalent). No proprietary or closed-source libraries are used.

## Code Generation

The WXT framework generates a minimal wrapper at build time to handle cross-browser API normalization (e.g., `browser.*` vs `chrome.*` namespaces). This is standard WXT behavior and the generated code is straightforward API glue -- no hidden functionality.

## Permissions

The extension requires only the minimum permissions necessary:

- `storage` -- save user settings and sleeping tab state
- `tabs` -- query, sleep, and restore tabs
- `alarms` -- schedule periodic tab sleep checks

No `host_permissions` are requested. The extension does not read or modify web page content.

## Privacy

LazyFox does not:
- Collect, transmit, or store any user data
- Use any analytics or tracking
- Make any network requests
- Access web page content

All data (settings, sleeping tab state) is stored locally in the browser's extension storage.
