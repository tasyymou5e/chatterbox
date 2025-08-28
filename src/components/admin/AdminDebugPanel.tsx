import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminDebug } from '@/hooks/useAdminDebug';
import { useToast } from '@/hooks/use-toast';
import { Bug, Settings, UserPlus, Loader2 } from 'lucide-react';

export const AdminDebugPanel = () => {
  const { debugInfo, isDebugging, runDiagnostics, createTestAdmin } = useAdminDebug();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@test.com');
  const [adminPassword, setAdminPassword] = useState('admin123!');

  const handleCreateTestAdmin = async () => {
    if (!adminEmail || !adminPassword) {
      toast({
        title: "Missing Information",
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAdmin(true);
    const result = await createTestAdmin(adminEmail, adminPassword);
    
    if (result.success) {
      toast({
        title: "Test Admin Created",
        description: "You can now sign in with the admin account",
      });
    } else {
      toast({
        title: "Failed to Create Admin",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsCreatingAdmin(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Debug Panel</h1>
          <p className="text-gray-400">Diagnostic tools for troubleshooting admin portal issues</p>
        </div>

        {/* Diagnostics Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bug className="h-5 w-5" />
              System Diagnostics
            </CardTitle>
            <CardDescription className="text-gray-400">
              Run comprehensive checks on the admin portal system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runDiagnostics}
              disabled={isDebugging}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isDebugging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>
            
            {debugInfo && (
              <div className="mt-4">
                <Label className="text-gray-300">Diagnostic Results:</Label>
                <Textarea
                  value={debugInfo}
                  readOnly
                  className="mt-2 h-64 bg-gray-900 border-gray-600 text-green-400 font-mono text-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Creation Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5" />
              Create Test Admin
            </CardTitle>
            <CardDescription className="text-gray-400">
              Create a test admin user for debugging purposes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-gray-300">
                  Admin Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="admin@test.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-gray-300">
                  Admin Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Strong password"
                />
              </div>
            </div>
            
            <Button
              onClick={handleCreateTestAdmin}
              disabled={isCreatingAdmin}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreatingAdmin ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Test Admin
                </>
              )}
            </Button>
            
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
              <p className="text-yellow-400 text-sm">
                <strong>Warning:</strong> This creates a test admin account. In production, 
                admin accounts should be created through secure administrative processes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Links */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Access</CardTitle>
            <CardDescription className="text-gray-400">
              Direct links to admin portal components
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate('/admin/login')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Admin Login
            </Button>
            <Button
              onClick={() => navigate('/admin/dashboard')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Admin Dashboard
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Main Site
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};