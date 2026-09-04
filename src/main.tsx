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
  // Check if mock API should be loaded.
  // When VITE_USE_MOCKS is 'false', the application communicates directly with the backend.
  if (import.meta.env.VITE_USE_MOCKS !== 'false') {
    const { startMockApi } = await import('./mocks/browser');
    await startMockApi();
  }
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
