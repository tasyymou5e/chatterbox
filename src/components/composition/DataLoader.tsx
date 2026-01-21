import { useEffect, useState, useCallback, ReactNode } from 'react';
import { AsyncContent } from './AsyncContent';

export interface DataLoaderProps<T> {
  query: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  deps?: unknown[];
  enabled?: boolean;
  children: (props: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => ReactNode;
}

/**
 * Render prop component for loading async data
 * Provides loading, error, and data states to children
 */
export function DataLoader<T>({
  query,
  onSuccess,
  onError,
  deps = [],
  enabled = true,
  children,
}: DataLoaderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await query();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [query, onSuccess, onError, enabled]);

  useEffect(() => {
    fetchData();
    // Dependencies are spread from deps prop - this is intentional for dynamic dependency support
  }, [fetchData, ...deps]);

  return <>{children({ data, loading, error, refetch: fetchData })}</>;
}

export interface DataLoaderWithUIProps<T> {
  query: () => Promise<T>;
  deps?: unknown[];
  enabled?: boolean;
  skeleton?: ReactNode;
  errorFallback?: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T, refetch: () => void) => ReactNode;
}

/**
 * DataLoader with built-in UI states
 */
export function DataLoaderWithUI<T>({
  query,
  deps = [],
  enabled = true,
  skeleton,
  errorFallback,
  emptyState,
  isEmpty,
  children,
}: DataLoaderWithUIProps<T>) {
  return (
    <DataLoader<T> query={query} deps={deps} enabled={enabled}>
      {({ data, loading, error, refetch }) => (
        <AsyncContent
          loading={loading}
          error={error}
          skeleton={skeleton}
          errorFallback={errorFallback}
          emptyState={emptyState}
          isEmpty={data ? isEmpty?.(data) : false}
          onRetry={refetch}
        >
          {data && children(data, refetch)}
        </AsyncContent>
      )}
    </DataLoader>
  );
}

export default DataLoader;
