import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Translation, useTranslation } from 'react-i18next';
import type { UseQueryResult } from '@tanstack/react-query';
import { PrayogApiError } from '@/services/api';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { errorReference } from '@/lib/ids';
import { Refused } from './Refused';

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
  const { t } = useTranslation();
  if (query.isPending) return <>{loading}</>;

  if (query.isError) {
    const err = query.error;
    const api = err instanceof PrayogApiError ? err : null;
    /*
     * The API decided this reader has no standing over this record, whatever
     * link produced the request. That is not an error and retrying will not
     * change it, so it is not dressed as one: it says what was refused, whose
     * it is, and where the reader can go instead.
     */
    if (api?.code === 'OUT_OF_JURISDICTION') {
      return <Refused eyebrow={t('refused.recordEyebrow')} title={api.message} reasons={api.details} />;
    }
    if (api?.status === 403) {
      return (
        <ErrorState
          title={t('states.viewOnlyTitle')}
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
        what={api?.message ?? t('states.noResponse')}
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
      // A class boundary cannot hold a hook, so the render prop supplies `t`.
      return (
        <Translation>
          {(t) => (
            <ErrorState
              title={t('states.unableToLoad', { label: this.props.label })}
              what={t('states.partialFailure')}
              reference={errorReference()}
              onRetry={() => this.setState({ error: null })}
            />
          )}
        </Translation>
      );
    }
    return this.props.children;
  }
}
