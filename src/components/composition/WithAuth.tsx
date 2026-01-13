import React, { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export interface WithAuthProps {
  requiredRole?: 'admin' | 'parent' | 'child';
  fallback?: ReactNode;
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Wraps components that require authentication
 * Redirects to login or shows fallback when not authenticated
 */
export const WithAuth: React.FC<WithAuthProps> = ({
  requiredRole,
  fallback,
  redirectTo = '/auth',
  children,
}) => {
  const navigate = useNavigate();
  const { user, loading, userRole } = useAuthStore();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  if (loading) {
    return <>{fallback || <PageSkeleton variant="default" />}</>;
  }

  if (!user) {
    return null;
  }

  // Check role if required
  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Access Denied</h3>
          <p className="text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export interface RequireAuthProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Simpler auth requirement - just checks if logged in
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({
  children,
  loadingFallback,
}) => {
  const { user, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <>{loadingFallback || <PageSkeleton variant="default" />}</>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default WithAuth;
