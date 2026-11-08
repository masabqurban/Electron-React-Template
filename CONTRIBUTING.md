# Contributing

Thanks for helping improve this template.

## Development workflow

1. Fork the repository and create a branch from `main`, e.g. `feat/note-tags`.
2. Install dependencies with `npm install`, then run `npm run dev`.
3. Make your change, then run:

   ```bash
   npm run check       # types, lint, formatting, unit tests
   npm run test:e2e    # drives the real app
   ```

4. Open a pull request using the template.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Every IPC call goes through the contract.** Add the channel to `src/shared/channels.ts`, its input schema and output type to `src/shared/contract.ts`, and the handler to `src/main/ipc/handlers.ts`. Never expose `ipcRenderer` or add ad-hoc channels.
- **The renderer is untrusted.** It must not import `electron` or Node modules (ESLint enforces this). Validate everything that crosses into the main process.
- **Shared code is environment-neutral.** `src/shared` can't import Electron, Node or React.
- **Keep Electron out of business logic.** Repositories and the dispatcher take their dependencies as arguments, so they're unit-tested without Electron.
- **Migrations are append-only.** Never edit a migration that has shipped.
- **Test through the real app** for user-facing flows (`tests/e2e`), and with unit tests for logic.
- **Placeholder data only.** Sample content uses "Acme" and `example.com`.
