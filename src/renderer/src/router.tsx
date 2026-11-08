import type { QueryClient } from '@tanstack/react-query';
import { createHashHistory, createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import { AppShell, EmptyState, NoteRoute, RouteError } from '@/app-shell';
import { AboutPage } from '@/features/about/about-page';
import { noteQuery } from '@/features/notes/queries';
import { settingsQuery } from '@/features/settings/queries';
import { SettingsPage } from '@/features/settings/settings-page';
import { IpcError } from '@/lib/ipc';

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: AppShell,
  errorComponent: RouteError,
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: EmptyState });

// Loaders fill the query cache before the page renders, so pages never flash a spinner.
const noteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/notes/$noteId',
  loader: ({ context, params }) => context.queryClient.query({ ...noteQuery(params.noteId), staleTime: 'static' }),
  component: NoteRoute,
  errorComponent: RouteError,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  loader: ({ context }) => context.queryClient.query({ ...settingsQuery, staleTime: 'static' }),
  component: SettingsPage,
});

const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/about', component: AboutPage });

const routeTree = rootRoute.addChildren([indexRoute, noteRoute, settingsRoute, aboutRoute]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    // Hash history works the same from the dev server and the app:// protocol.
    history: createHashHistory(),
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPendingMs: 300,
  });
}

/** Shows unexpected IPC failures from mutations as a toast. */
export function reportMutationError(error: unknown): void {
  toast.error(error instanceof IpcError ? error.message : 'Something went wrong.');
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
