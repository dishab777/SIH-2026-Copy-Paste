import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { PrayogApiError } from '@/services/api';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { errorReference } from '@/lib/ids';

export interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  /** Shaped like the content it replaces. */
  loading: ReactNode;
  empty?: { title: string; body: string; action?: { label: string; to?: string; onClick?: () => void } };
  isEmpty?: (data: T) => boolean;
  /** What failed, in the user's terms. */
  errorTitle: string;
  children: (data: T) => ReactNode;
}

export function QueryState<T>({ query, loading, empty, isEmpty, errorTitle, children }: QueryStateProps<T>) {
  if (query.isPending) return <>{loading}</>;

  if (query.isError) {
    const err = query.error;
    const api = err instanceof PrayogApiError ? err : null;
    if (api?.status === 403) {
      return (
        <ErrorState
          title="You can view this programme, but not this record"
          what={api.message}
          details={api.details}
          reference={api.reference}
          onRetry={() => void query.refetch()}
        />
      );
    }
    return (
      <ErrorState
        title={errorTitle}
        what={api?.message ?? 'The service did not respond. Nothing you entered has been lost.'}
        details={api?.details}
        reference={api?.reference ?? errorReference()}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data as T;
  if (empty && isEmpty?.(data)) {
    return <EmptyState title={empty.title} body={empty.body} action={empty.action} />;
  }
  return <>{children(data)}</>;
}

interface BoundaryProps {
  label: string;
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Widget-level boundary. A panel that fails takes only itself down, and the rest
 * of the page keeps working.
 */
export class WidgetBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[prayog] ${this.props.label} failed`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorState
          title={`Unable to load ${this.props.label}.`}
          what="Only this panel failed. The rest of the page is unaffected."
          reference={errorReference()}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
