# Electron + React Template

A production-ready **Electron + React + TypeScript** desktop app template for **Windows, macOS and Linux**. It ships as a working offline-first notes app ("Acme Notes") with a typed and validated IPC layer, a locally stored SQLite database, a locked-down renderer, native menus, tray and deep links, auto-updates, and a CI pipeline that tests and packages the app on all three operating systems.

![Electron](https://img.shields.io/badge/Electron-45-47848f?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/electron--vite-6-646cff?logo=vite&logoColor=white)
![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-555)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

> All content in this repository (sample notes, the "Acme" name, `example.com` addresses) is placeholder data.
> See also the [React.js Template](https://github.com/masabqurban/React.js-Template), which shares this frontend stack.

## Contents

- [Highlights](#highlights)
- [Use this template](#use-this-template)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Adding a feature](#adding-a-feature)
- [Security](#security)
- [Data storage](#data-storage)
- [Native integration](#native-integration)
- [Testing](#testing)
- [Packaging and releases](#packaging-and-releases)
- [Code signing](#code-signing)

## Highlights

| Area          | What's included                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Stack**     | Electron 45, React 19, TypeScript (strict), electron-vite with hot reload, Tailwind CSS 4, Radix UI, TanStack Router and Query          |
| **Typed IPC** | One contract file defines every channel, its Zod input schema and its output type; both processes are type-checked against it           |
| **Security**  | Context isolation, sandboxed renderer, no Node in the page, strict CSP over a custom `app://` protocol, navigation lock, sender checks  |
| **Data**      | Node's built-in SQLite (no native modules to rebuild), versioned migrations, parameterised queries, WAL mode                            |
| **Native**    | Application menu, tray / menu bar icon, deep links (`acme-notes://`), single instance, remembered window position, light/dark theme     |
| **Updates**   | electron-updater from GitHub Releases, with in-app status and "Restart and update"                                                      |
| **Packaging** | electron-builder: NSIS installer (Windows x64/arm64), DMG + ZIP (macOS Intel/Apple Silicon), AppImage, deb and rpm (Linux)              |
| **Quality**   | Vitest (31 unit tests), Playwright driving the real Electron app (9 e2e tests), type-aware ESLint with process-boundary rules, Prettier |
| **CI/CD**     | Tests and packages on Windows, macOS and Linux runners; a version tag builds and uploads every installer to a draft GitHub Release      |

## Use this template

**1. Create your repository.** Click **Use this template → Create a new repository** at the top of this page. Your new repository gets a clean history and no link back to this one. Or use the GitHub CLI:

```bash
gh repo create my-app --template masabqurban/Electron-React-Template --private --clone
cd my-app
```

Prefer no Git history at all? Run `npx degit masabqurban/Electron-React-Template my-app`.

**2. Install and run it.**

```bash
npm install
npm run dev    # opens the app with hot reload
```

**3. Make it yours.**

- `package.json`: `name`, `productName`, `description`, `author` and `homepage`.
- `electron-builder.yml`: `appId` (reverse-DNS, e.g. `com.yourcompany.yourapp`), `productName`, the `protocols` scheme, Linux `maintainer`, and `publish.owner` / `publish.repo`. **Pick the `appId` before your first release:** installed apps, settings and updates are tied to it.
- `src/shared/deep-link.ts`: the `PROTOCOL` scheme (keep it in sync with `electron-builder.yml`).
- `src/main/security.ts`: `APP_HOST`, and the repository links in `src/main/menu.ts` and `src/renderer/src/features/about/about-page.tsx`.
- Replace `resources/icon.png` and `build/icon.png` with your 1024×1024 icon, and the colour tokens in `src/renderer/src/styles.css`.
- Replace the copyright holder in `LICENSE` (or choose another license), and rewrite this README for your project.

**4. Remove what you don't need.** The notes app is there to show the patterns end to end. Keep the parts you'll build on and delete the rest:

- **Notes:** delete `src/renderer/src/features/notes/`, `src/main/db/notes-repository.ts`, the `notes.*` channels in `src/shared/channels.ts` and `src/shared/contract.ts`, their handlers in `src/main/ipc/handlers.ts`, and the `notes` table (add a migration, never edit a shipped one).
- **Welcome notes:** `src/main/db/seed.ts` adds three sample notes on first launch. Remove the call in `src/main/index.ts`.
- **Tray:** if you don't need it, remove `src/main/tray.ts` and the `closeToTray` setting.

**5. Turn on the repository settings.** In **Settings → Code security**, enable Dependabot alerts and private vulnerability reporting (`SECURITY.md` points reporters there). In **Settings → Actions → General**, allow workflows to create releases (read and write permissions). CI runs on your first push with no secrets required; add the [code signing](#code-signing) secrets when you have certificates.

## Getting started

Requirements: **Node.js 22.12+** (24 recommended, see `.nvmrc`). Building installers for macOS requires a Mac (CI provides one).

```bash
npm install
npm run dev
```

The app opens with three sample notes. Notes are stored in your OS's app-data folder (shown on the About page), so they survive restarts and reinstalls.

## Scripts

| Command               | What it does                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`         | Runs the app with hot reload for the UI and automatic restarts for the main process         |
| `npm run build`       | Builds main, preload and renderer into `out/`                                               |
| `npm start`           | Runs the built app                                                                          |
| `npm run check`       | Type checks, lints, checks formatting and runs unit tests: everything CI checks before e2e  |
| `npm test`            | Unit tests (Vitest)                                                                         |
| `npm run test:e2e`    | Builds, then drives the real app with Playwright                                            |
| `npm run package`     | Builds installers for the current OS into `release/<version>/`                              |
| `npm run package:dir` | Builds an unpacked app (faster; good for trying the packaged build)                         |
| `npm run release`     | Builds installers and uploads them to a draft GitHub Release (used by the release workflow) |

## Project structure

```text
src/
├── shared/                 Code every process uses (no Electron, Node or React imports)
│   ├── channels.ts         The list of IPC channels and events
│   ├── contract.ts         Input schemas, output types, errors: the IPC contract
│   └── deep-link.ts        Parsing acme-notes:// links
├── main/                   The main process (Node.js + Electron APIs)
│   ├── index.ts            Composition root: lifecycle, single instance, deep links, wiring
│   ├── security.ts         app:// protocol, CSP, navigation lock, permissions
│   ├── window.ts           The main window, with saved size and position
│   ├── ipc/                Dispatcher (validation + errors), handlers, registration
│   ├── db/                 SQLite connection, migrations, repositories, sample data
│   ├── menu.ts  tray.ts    Native menu and tray icon
│   ├── updater.ts          Auto-updates
│   └── logger.ts           File and console logging
├── preload/index.ts        The only bridge: exposes window.api
└── renderer/               The UI: a sandboxed web page
    ├── index.html
    └── src/
        ├── features/       notes, settings, about: pages, components, queries
        ├── components/ui/  Button, Input, Switch, ConfirmDialog
        ├── lib/ipc.ts      Typed client for window.api
        ├── app-shell.tsx   Layout and listeners for menu and deep-link events
        └── router.tsx      Routes and loaders
tests/e2e/                  Playwright tests that launch the built app
resources/                  Files the running app reads (icon)
build/                      Packaging resources (installer icon, macOS entitlements)
```

## Architecture

An Electron app runs as separate processes with different privileges:

| Process      | Can do                                    | Trust                                    |
| ------------ | ----------------------------------------- | ---------------------------------------- |
| **Main**     | Everything: files, database, OS, network  | Trusted                                  |
| **Preload**  | Talk to main through a fixed channel list | Trusted, but sandboxed and minimal       |
| **Renderer** | Render UI, call `window.api`              | **Untrusted**, treated like any web page |

**The IPC contract is the spine of the app.** `src/shared/contract.ts` declares every channel the renderer may call, a Zod schema for its input, and its output type. From that single file:

- the preload only forwards channels in the list, and only listens to declared events;
- the main process validates every input before a handler runs, and rejects calls from any frame that isn't the app's own page;
- handlers must implement every channel with the right types, or the build fails;
- the renderer gets autocompletion and type errors for every call (`call('notes.update', { id, pinned: true })`).

**Errors are data.** Handlers throw `AppError` with a stable code (`NOT_FOUND`, `VALIDATION`, …). The dispatcher returns it as `{ ok: false, error }` instead of letting Electron serialise an exception. Unexpected errors are logged in main and reach the renderer only as a generic message.

**The main process is wired in one place.** `src/main/index.ts` creates the database, repositories, updater and window once, and passes them to the modules that need them. Repositories and the dispatcher don't import Electron, so they're unit-tested directly.

**The renderer is a normal React app.** TanStack Query caches IPC results the same way it would cache HTTP responses, and TanStack Router loaders fill the cache before a page renders. Events from the menu, tray and deep links arrive through `subscribe()`.

## Adding a feature

To add, say, a "duplicate note" action:

1. **Contract:** add `'notes.duplicate'` to `invokeChannels` in `src/shared/channels.ts`, then an input schema in `inputSchemas` and an output type in `Outputs` (`src/shared/contract.ts`). Type checking now fails until both sides implement it.
2. **Main:** implement it in the repository and add the handler in `src/main/ipc/handlers.ts`.
3. **Renderer:** add a mutation in `features/notes/queries.ts` that calls `call('notes.duplicate', { id })`.
4. **Tests:** a unit test for the repository method and, for user-facing flows, an e2e test.

## Security

The template follows Electron's [security checklist](https://www.electronjs.org/docs/latest/tutorial/security):

- **Context isolation and sandbox on, Node integration off.** The page can't reach `require`, `process` or `ipcRenderer`. An e2e test checks that `window.api` exposes exactly `invoke`, `on` and `platform`.
- **Custom `app://` protocol instead of `file://`.** Every response carries a strict Content Security Policy (`script-src 'self'`, no inline scripts, no `eval`), and paths can't escape the renderer folder. An e2e test injects an inline script and checks that it doesn't run. In development the CSP adds only what Vite's hot reload needs.
- **Validated IPC.** Every input is checked by Zod in the main process. The sender must be the app's own top-level frame. `app.openExternal` accepts only `https://` URLs, never `file:` or `javascript:`.
- **Navigation lock.** The window can't navigate away from the app, `window.open` is denied (https links open in the system browser), and `<webview>` is blocked.
- **No permissions.** Camera, microphone, location and notification requests are denied by default.
- **Developer tools** are only in the menu of development builds.
- **Deep links are untrusted input.** Any website can open `acme-notes://`, so links are parsed strictly and unknown actions are ignored.

## Data storage

Data lives in SQLite through Node's built-in `node:sqlite` module. There are **no native modules**, so there's nothing to rebuild for each OS, CPU architecture or Electron version, which is the most common source of cross-platform build failures.

- **Location:** Electron's `userData` folder (`%APPDATA%\Acme Notes` on Windows, `~/Library/Application Support/Acme Notes` on macOS, `~/.config/Acme Notes` on Linux), shown on the About page.
- **Migrations:** `src/main/db/database.ts` holds an ordered list. The database records how many have run (`PRAGMA user_version`), each runs in a transaction, and a failing one rolls back. Never edit a migration that has shipped: append a new one.
- **Queries** are parameterised. Search escapes `LIKE` wildcards, and a test checks that SQL injection in the search box is harmless.
- **Settings** are stored as validated JSON. Corrupt or outdated values fall back to defaults instead of crashing the app.

Prefer an ORM? The repositories are the only code that touches SQL, so Drizzle, Kysely or Prisma can replace them without changes elsewhere.

## Native integration

| Feature            | Where                     | Notes                                                                             |
| ------------------ | ------------------------- | --------------------------------------------------------------------------------- |
| Application menu   | `src/main/menu.ts`        | Platform conventions: the app menu and Settings live in different places on macOS |
| Keyboard shortcuts | menu accelerators         | `Ctrl/Cmd+N` new note, `Ctrl/Cmd+,` settings, `Ctrl/Cmd+F` search                 |
| Tray / menu bar    | `src/main/tray.ts`        | Shown when "Keep running in the tray" is on; macOS uses a template image          |
| Deep links         | `src/shared/deep-link.ts` | `acme-notes://new?title=…`, `acme-notes://settings`; handled on all three OSes    |
| Single instance    | `src/main/index.ts`       | A second launch focuses the running app and passes on its deep link               |
| Window state       | `src/main/window.ts`      | Size, position and maximised state are restored, if still on a connected display  |
| Theme              | Settings → Appearance     | Sets `nativeTheme`, so native menus, dialogs and the page follow the same theme   |
| Logs               | `src/main/logger.ts`      | Rotating log files in the OS's log folder                                         |

## Testing

```bash
npm test            # unit tests: migrations, repositories, IPC validation, deep links
npm run test:e2e    # builds, then launches the real app with Playwright
```

E2E tests launch the built Electron app with a fresh, temporary data folder each time (`ACME_NOTES_USER_DATA`), so they never touch your own notes. They cover:

- the first launch, and creating, editing, searching, pinning and deleting notes;
- that data and settings survive a restart;
- the menu and the theme;
- the sandbox, IPC validation, the CSP and navigation blocking.

CI runs them on Windows, macOS and Linux (under a virtual display).

## Packaging and releases

```bash
npm run package       # installers for the current OS, in release/<version>/
```

| OS      | Output                                      | Architectures              |
| ------- | ------------------------------------------- | -------------------------- |
| Windows | NSIS installer (`.exe`)                     | x64, arm64                 |
| macOS   | `.dmg` to download, `.zip` for auto-updates | Intel (x64), Apple Silicon |
| Linux   | AppImage, `.deb`, `.rpm`                    | x64                        |

Each OS builds its own installers, so CI uses a runner per OS. To release:

```bash
npm version minor          # bumps package.json and creates a v* tag
git push --follow-tags     # the Release workflow builds every installer
```

The workflow uploads everything to a **draft** GitHub Release. Review it and click **Publish**. Installed apps then find the update through electron-updater, download it in the background, and offer **Restart and update** on the About page (or install it on the next quit).

## Code signing

Unsigned apps work, but Windows SmartScreen and macOS Gatekeeper warn users, and **macOS auto-updates require a signed app**. Add these repository secrets when you have certificates. The release workflow uses them automatically:

| Secret                                                     | For                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`                     | A **Developer ID Application** certificate (`.p12`, base64), from the Apple Developer Program |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Notarisation, so Gatekeeper accepts the app                                                   |
| `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`                     | A Windows code-signing certificate (`.pfx`, base64)                                           |

For Windows, [Azure Trusted Signing](https://learn.microsoft.com/azure/trusted-signing/) is a lower-cost alternative to a `.pfx`. Configure it with `azureSignOptions` in `electron-builder.yml`.

## License

[MIT](./LICENSE)
