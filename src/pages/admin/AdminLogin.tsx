import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useLoginRateLimiter } from '@/hooks/useLoginRateLimiter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertTriangle, Clock } from 'lucide-react';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { secureLog } from '@/utils/wideLogger';

export default function AdminLogin() {
  const { signIn, loading, user, isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  
  // Stricter rate limiting for admin login: 3 attempts per 10 minutes
  const { checkAttempt, remainingAttempts, isLocked, formattedTimeRemaining, refreshStatus } = useLoginRateLimiter('admin');

  // Enhanced redirect check - only if fully authenticated and admin status confirmed
  if (!loading && user && isAdmin && user.id && user.email) {
    console.log('✅ AdminLogin: User already authenticated as admin, redirecting');
    return <Navigate to="/admin/dashboard" replace />;
  }


  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    // Update tracked email for rate limiting
    setLoginEmail(email);
    
    if (!email || !password) {
      toast({
        title: "Input Required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    // Check rate limit BEFORE attempting login
    if (!checkAttempt(email)) {
      console.log('🚫 Admin login blocked by rate limiter for:', email);
      toast({
        title: "Account Temporarily Locked",
        description: `Too many failed attempts. Please wait ${formattedTimeRemaining} before trying again.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSigningIn(true);
    console.log('🔐 Admin login attempt for:', email);

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
        // Refresh rate limit status after failed attempt
        refreshStatus(email);
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
        refreshStatus(email);
        toast({
          title: "Access Denied",
          description: "Access denied. Admin privileges required.",
          variant: "destructive",
        });
        setIsSigningIn(false);
      }
    } catch (error: unknown) {
      console.error('💥 Unexpected login error:', getErrorMessage(error));
      toast({
        title: "Connection Error", 
        description: getErrorMessage(error),
        variant: "destructive",
      });
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Rate Limit Lockout Alert */}
        {isLocked && (
          <div data-testid="lockout-timer" className="mb-6 p-4 bg-red-900/40 border border-red-500/50 rounded-lg animate-pulse">
            <div className="flex items-center space-x-2 text-red-300">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">Account Temporarily Locked</span>
            </div>
            <p className="mt-1 text-xs text-red-200">
              Too many failed login attempts. Please wait <span className="font-mono font-bold">{formattedTimeRemaining}</span> before trying again.
            </p>
          </div>
        )}

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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                disabled={isSigningIn || isLocked}
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In & Verifying Access...
                  </>
                ) : isLocked ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Locked - Wait {formattedTimeRemaining}
                  </>
                ) : (
                  'Sign In to Admin Portal'
                )}
              </Button>
              
              {/* Remaining attempts warning */}
              {!isLocked && remainingAttempts < 3 && loginEmail && (
                <p className="mt-2 text-xs text-amber-400 text-center">
                  ⚠️ {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before lockout
                </p>
              )}
            </form>


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