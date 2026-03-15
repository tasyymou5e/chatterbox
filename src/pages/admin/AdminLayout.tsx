import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import { preloadCharts } from '@/utils/chartPreloader';
import { 
  Users, 
  Home, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  Activity,
  Brain,
  Loader2,
  TrendingUp,
  Wrench,
  ShieldCheck,
  HeartPulse,
  BookOpen,
  Bug,
  Gamepad2
} from 'lucide-react';

export default function AdminLayout() {
  const { signOut, user, signingOut } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  void navigate; // Available for future navigation needs
  const location = useLocation();

  // Preload chart chunks when admin layout mounts
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
      // Let AdminRoute handle the redirect automatically - no manual navigation
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Admin Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold text-white">Admin Portal</span>
              </div>
              
              <div className="hidden md:flex space-x-6">
                <Link 
                  to="/admin/dashboard" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/dashboard' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link 
                  to="/admin/security-center" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/security-center' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Security Center</span>
                </Link>
                <Link 
                  to="/admin/families"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/families' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Families</span>
                </Link>
                <Link 
                  to="/admin/users" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/users' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                </Link>
                <Link 
                  to="/admin/reports" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/reports' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                </Link>
                <Link 
                  to="/admin/content" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/content' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Content</span>
                </Link>
                <Link 
                  to="/admin/system-monitoring" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/system-monitoring' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>System Monitoring</span>
                </Link>
                <Link 
                  to="/admin/llm-monitoring" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/llm-monitoring' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Brain className="h-4 w-4" />
                  <span>LLM Monitor</span>
                </Link>
                <Link 
                  to="/admin/uptime-report" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/uptime-report' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Uptime Report</span>
                </Link>
                <Link 
                  to="/admin/integrity" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/integrity' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Integrity</span>
                </Link>
                <Link 
                  to="/admin/auto-repair-logs" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/auto-repair-logs' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Wrench className="h-4 w-4" />
                  <span>Auto-Repair</span>
                </Link>
                <Link 
                  to="/admin/data-health" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/data-health' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <HeartPulse className="h-4 w-4" />
                  <span>Data Health</span>
                </Link>
                <Link 
                  to="/admin/architecture-ebook" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/architecture-ebook' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Ebook</span>
                </Link>
                <Link 
                  to="/admin/logs-triage" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/logs-triage' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Bug className="h-4 w-4" />
                  <span>Logs Triage</span>
                </Link>
                <Link 
                  to="/admin/kids-catalog" 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === '/admin/kids-catalog' 
                      ? 'text-white bg-gray-700' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Gamepad2 className="h-4 w-4" />
                  <span>Kids Catalog</span>
                </Link>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm">
                {user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <AdminErrorBoundary componentName="AdminMain">
          <Outlet />
        </AdminErrorBoundary>
      </main>
    </div>
  );
}