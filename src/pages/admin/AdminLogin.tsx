import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertTriangle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminLogin() {
  const { signIn, loading, user, isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [parentSignupEnabled, setParentSignupEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Enhanced redirect check - only if fully authenticated and admin status confirmed
  if (!loading && user && isAdmin && user.id && user.email) {
    console.log('✅ AdminLogin: User already authenticated as admin, redirecting');
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Load site settings when admin is authenticated
  useEffect(() => {
    if (user && isAdmin && !loading) {
      loadSiteSettings();
    }
  }, [user, isAdmin, loading]);

  const loadSiteSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'parent_signup_enabled')
        .single();

      if (error) {
        console.error('Error loading site settings:', error);
      } else {
        setParentSignupEnabled(data.setting_value === 'true' || data.setting_value === true);
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateSiteSetting = async (settingKey: string, settingValue: boolean) => {
    setUpdatingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-site-settings', {
        body: {
          setting_key: settingKey,
          setting_value: settingValue
        }
      });

      if (error) {
        throw error;
      }

      if (settingKey === 'parent_signup_enabled') {
        setParentSignupEnabled(settingValue);
      }

      toast({
        title: "Setting Updated",
        description: `${settingKey.replace('_', ' ')} has been ${settingValue ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating site setting:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update site setting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningIn(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    console.log('🔐 Admin login attempt for:', email);
    
    if (!email || !password) {
      toast({
        title: "Input Required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsSigningIn(false);
      return;
    }

    try {
      const result = await signIn(email, password);
      
      if (result.error) {
        console.error('❌ Login failed:', result.error);
        if (result.error.message?.includes('Invalid login credentials')) {
          toast({
            title: "Access Denied",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else if (result.error.message?.includes('Too many requests')) {
          toast({
            title: "Rate Limited",
            description: "Too many login attempts. Please wait a moment and try again.",
            variant: "destructive",
          });
        } else if (result.error.message?.includes('Network')) {
          toast({
            title: "Connection Error",
            description: "Network error. Please check your connection and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: "Login failed. Please try again.",
            variant: "destructive",
          });
        }
        setIsSigningIn(false);
      } else if (result.isAdmin) {
        console.log('✅ Admin login successful, navigating immediately...');
        toast({
          title: "Welcome Admin",
          description: "Welcome back, Admin!",
        });
        
        // Navigate immediately since auth state is established atomically in signIn
        console.log('🔄 Navigating to admin dashboard...');
        navigate('/admin/dashboard');
        setIsSigningIn(false);
      } else {
        console.error('❌ User is not an admin');
        toast({
          title: "Access Denied",
          description: "Access denied. Admin privileges required.",
          variant: "destructive",
        });
        setIsSigningIn(false);
      }
    } catch (error) {
      console.error('💥 Unexpected login error:', error);
      toast({
        title: "Connection Error", 
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">Administrator Access Only</span>
          </div>
          <p className="mt-1 text-xs text-red-300">
            This portal is restricted to authorized administrators only.
          </p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Admin Portal
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to access the administrative dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSigningIn}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In & Verifying Access...
                  </>
                ) : (
                  'Sign In to Admin Portal'
                )}
              </Button>
            </form>

            {/* Site Settings Section - Only show when authenticated as admin */}
            {user && isAdmin && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <Button
                  onClick={() => setShowSettings(!showSettings)}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-gray-300 hover:text-white hover:bg-gray-700"
                  disabled={loadingSettings}
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Site Settings</span>
                  </div>
                  {loadingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : showSettings ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {showSettings && (
                  <div className="mt-4 space-y-4 p-4 bg-gray-750 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-300">
                          Parent Signup
                        </Label>
                        <p className="text-xs text-gray-400">
                          Allow new parents to sign up from the main site
                        </p>
                      </div>
                      <Switch
                        checked={parentSignupEnabled}
                        onCheckedChange={(checked) => updateSiteSetting('parent_signup_enabled', checked)}
                        disabled={updatingSettings}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                    
                    <div className="text-xs text-gray-500 border-t border-gray-600 pt-3">
                      Status: Parent signup is currently{' '}
                      <span className={parentSignupEnabled ? 'text-green-400' : 'text-red-400'}>
                        {parentSignupEnabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex flex-col items-center space-y-2">
              <p className="text-xs text-gray-500 text-center">
                For security purposes, all admin access is logged and monitored.
              </p>
              <Button
                onClick={() => navigate('/admin/reset-password')}
                variant="ghost"
                size="sm"
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Forgot Password?
              </Button>
              <Button
                onClick={() => navigate('/admin/debug')}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                🔧 Debug Panel
              </Button>
              <Button
                onClick={() => navigate('/admin/bootstrap')}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-gray-300"
              >
                🚀 Bootstrap
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}