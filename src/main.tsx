import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './i18n';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Authorisation and validation failures are answers, not outages.
        const status = (error as { status?: number }).status;
        if (status === 403 || status === 404 || status === 409 || status === 422) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

async function bootstrap(): Promise<void> {
  // The mock API is a single removable chunk. A real deployment drops this import
  // and the bundle with it; nothing else in the product talks to a network directly.
  const { startMockApi } = await import('./mocks/browser');
  await startMockApi();
  const container = document.getElementById('root');
  if (!container) throw new Error('Root container is missing from the document.');
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
