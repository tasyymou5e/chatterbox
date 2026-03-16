import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { cError } from '@/utils/wideLogger';

export const AdminBootstrap = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasAdmins, setHasAdmins] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Check for force mode to allow additional admin creation
  const urlParams = new URLSearchParams(window.location.search);
  const forceMode = urlParams.get('force') === 'true';
  const isAdditionalAdminMode = hasAdmins && forceMode;

  useEffect(() => {
    checkForAdmins();
  }, []);

  const checkForAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);
      
      if (error) {
        cError('Error checking for admins', error);
        setHasAdmins(false);
      } else {
        setHasAdmins(data && data.length > 0);
      }
    } catch (error) {
      cError('Error checking for admins', error);
      setHasAdmins(false);
    } finally {
      setIsChecking(false);
    }
  };

  const createBootstrapAdmin = async () => {
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`
        }
      });

      if (authError) {
        // Handle "user already exists" error gracefully
        if (authError.message.includes('User already registered')) {
          throw new Error(`Email ${email} is already registered. Please use a different email.`);
        }
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from signup');
      }

      // Step 2: Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          { user_id: authData.user.id, role: 'admin' }
        ]);

      if (roleError) {
        throw new Error(`Failed to assign admin role: ${roleError.message}`);
      }

      toast({
        title: isAdditionalAdminMode ? "Additional Admin Created" : "Bootstrap Admin Created",
        description: `Admin user created successfully with email: ${email}`,
      });

      // Refresh the admin check
      await checkForAdmins();

    } catch (error) {
      cError('Bootstrap admin creation error', error);
      
      // Provide user guidance based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      let userGuidance = '';
      
      if (errorMessage.includes('already registered')) {
        userGuidance = ' Try using a different email address.';
      } else if (errorMessage.includes('network')) {
        userGuidance = ' Please check your internet connection and try again.';
      } else if (errorMessage.includes('role')) {
        userGuidance = ' The user was created but admin privileges could not be assigned. Contact support.';
      } else {
        userGuidance = ' Please try again or contact support if the issue persists.';
      }
      
      toast({
        title: "Failed to Create Admin",
        description: errorMessage + userGuidance,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Checking admin status...</p>
        </div>
      </div>
    );
  }

  if (hasAdmins && !forceMode) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800 border-gray-700 max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-600 rounded-full">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              System Ready
            </CardTitle>
            <CardDescription className="text-gray-400">
              Admin users already exist in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => navigate('/admin/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-600 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {isAdditionalAdminMode ? "Create Additional Admin" : "Bootstrap Admin"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isAdditionalAdminMode 
                ? "Create another admin user for the system"
                : "No admin users found. Create the first admin account."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`p-3 border rounded ${
                isAdditionalAdminMode 
                  ? "bg-blue-900/20 border-blue-500/30" 
                  : "bg-yellow-900/20 border-yellow-500/30"
              }`}>
                <p className={`text-sm ${
                  isAdditionalAdminMode ? "text-blue-400" : "text-yellow-400"
                }`}>
                  <strong>{isAdditionalAdminMode ? "Additional Admin Mode:" : "Bootstrap Mode:"}</strong> 
                  {isAdditionalAdminMode 
                    ? " This will create another admin user for your system."
                    : " This will create the first admin user for your system."
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bootstrap-email" className="text-gray-300">
                  Admin Email
                </Label>
                <Input
                  id="bootstrap-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  spellCheck={false}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="admin@your-domain.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bootstrap-password" className="text-gray-300">
                  Admin Password
                </Label>
                <Input
                  id="bootstrap-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Strong password"
                />
              </div>

              <Button
                onClick={createBootstrapAdmin}
                disabled={isCreating}
                className={`w-full text-white ${
                  isAdditionalAdminMode 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isAdditionalAdminMode ? "Creating Additional Admin..." : "Creating Bootstrap Admin..."}
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {isAdditionalAdminMode ? "Create Additional Admin" : "Create Bootstrap Admin"}
                  </>
                )}
              </Button>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                  {isAdditionalAdminMode 
                    ? "Additional admins can be created by existing administrators."
                    : "This bootstrap process is only available when no admin users exist."
                  }
                </p>
                {isAdditionalAdminMode && (
                  <div className="mt-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/login')}
                      className="text-xs"
                    >
                      Back to Admin Login
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};