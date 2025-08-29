import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminDebug } from '@/hooks/useAdminDebug';
import { Bug, Settings, UserPlus, Loader2 } from 'lucide-react';

export const AdminDebugPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Test if useAdminDebug is the issue
  let debugHookData = null;
  try {
    debugHookData = useAdminDebug();
  } catch (error) {
    console.error('useAdminDebug hook error:', error);
  }

  const [testState, setTestState] = useState('Initial State');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const handleTestClick = () => {
    setTestState('State Updated!');
    toast({
      title: "Test Toast",
      description: "All basic functionality is working!"
    });
  };

  const handleCreateTestAdmin = async () => {
    if (!debugHookData) {
      toast({
        title: "Hook Error",
        description: "useAdminDebug hook is not available",
        variant: "destructive",
      });
      return;
    }

    if (!adminEmail || !adminPassword) {
      toast({
        title: "Missing Information", 
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const result = await debugHookData.createTestAdmin(adminEmail, adminPassword);
      
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
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create admin: ${error}`,
        variant: "destructive",
      });
    }
    setIsCreatingAdmin(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Debug Panel</h1>
        <p className="text-muted-foreground">Progressive restoration - testing all functionality</p>
      </div>

      {/* Basic Functionality Test */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Functionality Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Test State: {testState}</p>
          <Button onClick={handleTestClick} variant="outline">
            Test State & Toast
          </Button>
          <Button onClick={() => navigate('/admin')} variant="outline">
            Back to Admin
          </Button>
        </CardContent>
      </Card>

      {/* Debug Hook Status */}
      <Card>
        <CardHeader>
          <CardTitle>useAdminDebug Hook Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${debugHookData ? 'text-green-600' : 'text-red-600'}`}>
            Hook Status: {debugHookData ? 'Working ✓' : 'Failed ✗'}
          </p>
          {debugHookData && (
            <div className="mt-2 space-y-2">
              <Button 
                onClick={debugHookData.runDiagnostics}
                disabled={debugHookData.isDebugging}
                variant="outline"
              >
                {debugHookData.isDebugging ? (
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
              
              {debugHookData.debugInfo && (
                <Textarea
                  value={debugHookData.debugInfo}
                  readOnly
                  className="mt-2 h-32 font-mono text-sm"
                  placeholder="Diagnostic results will appear here..."
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Creation Section */}
      {debugHookData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Test Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@test.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Admin Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Strong password"
                />
              </div>
            </div>
            
            <Button
              onClick={handleCreateTestAdmin}
              disabled={isCreatingAdmin}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};