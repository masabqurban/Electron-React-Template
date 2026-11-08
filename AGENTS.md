# Agent instructions

- Read `README.md` (architecture, security, IPC contract) and `CONTRIBUTING.md` (conventions) first.
- Three processes: `src/main` (trusted, Node + Electron), `src/preload` (the only bridge), `src/renderer` (untrusted web page). `src/shared` is imported by all and must stay environment-neutral.
- New IPC: add the channel to `src/shared/channels.ts`, its schema to `inputSchemas` and type to `Outputs` in `src/shared/contract.ts`, then the handler in `src/main/ipc/handlers.ts`. The renderer calls it with `call()` from `src/renderer/src/lib/ipc.ts`.
- Never weaken `webPreferences` (contextIsolation, sandbox, nodeIntegration) or the CSP in `src/main/security.ts`.
- Database changes: append a migration to `src/main/db/database.ts`; never edit an existing one.
- E2E tests need a build: `npm run test:e2e` builds first. When running from a VS Code terminal, `ELECTRON_RUN_AS_NODE` is stripped by the test fixture.
- Run `npm run check` and `npm run test:e2e` before considering work done.
