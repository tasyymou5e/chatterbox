import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface AdminBootstrapRouteProps {
  children: React.ReactNode;
}

export const AdminBootstrapRoute = ({ children }: AdminBootstrapRouteProps) => {
  const { 
    getLoading, 
    setLoading, 
    setError 
  } = useUIStore();
  
  const loading = getLoading('adminBootstrapCheck');
  const [hasAdmins, setHasAdmins] = React.useState<boolean | null>(null);

  useEffect(() => {
    const checkForAdmins = async () => {
      setLoading('adminBootstrapCheck', true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);
        
        if (error) {
          console.error('Error checking for admins:', error);
          setError('adminBootstrapCheck', 'Failed to check for existing admins');
          setHasAdmins(false);
        } else {
          setHasAdmins(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error checking for admins:', error);
        setError('adminBootstrapCheck', 'Unexpected error checking admins');
        setHasAdmins(false);
      } finally {
        setLoading('adminBootstrapCheck', false);
      }
    };

    checkForAdmins();
  }, [setLoading, setError]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If admins exist, redirect to login
  if (hasAdmins) {
    return <Navigate to="/admin/login" replace />;
  }

  // If no admins exist, allow access to bootstrap
  return <>{children}</>;
};