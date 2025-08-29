import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AdminBootstrapRouteProps {
  children: React.ReactNode;
}

export const AdminBootstrapRoute = ({ children }: AdminBootstrapRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [hasAdmins, setHasAdmins] = useState<boolean | null>(null);

  useEffect(() => {
    const checkForAdmins = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);
        
        if (error) {
          console.error('Error checking for admins:', error);
          setHasAdmins(false);
        } else {
          setHasAdmins(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error checking for admins:', error);
        setHasAdmins(false);
      } finally {
        setLoading(false);
      }
    };

    checkForAdmins();
  }, []);

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