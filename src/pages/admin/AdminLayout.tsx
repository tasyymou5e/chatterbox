import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import { preloadCharts } from '@/utils/chartPreloader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Shield, LogOut, Loader2 } from 'lucide-react';

export default function AdminLayout() {
  const { signOut, user, signingOut } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    preloadCharts();
  }, []);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of the admin portal.",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-900">
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Slim top header */}
          <header className="h-12 flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-gray-300 hover:text-white hover:bg-gray-700" />
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-bold text-white hidden sm:inline">Admin Portal</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs hidden sm:inline">
                {user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 h-8 text-xs"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Signing Out…
                  </>
                ) : (
                  <>
                    <LogOut className="h-3 w-3 mr-1" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <AdminErrorBoundary componentName="AdminMain">
              <Outlet />
            </AdminErrorBoundary>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
