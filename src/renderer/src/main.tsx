import './styles.css';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createAppRouter, reportMutationError } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    // Data is local: no refetch on focus, and failures are real errors, not flaky networks.
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: false },
  },
  mutationCache: new MutationCache({ onError: reportMutationError }),
});

const router = createAppRouter(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
