import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

export default function AdminLogin() {
  const { signIn, loading, user, isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect if already authenticated as admin
  if (!loading && user && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSigningIn(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validate inputs
    if (!email?.trim() || !password?.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      setIsSigningIn(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Categorize errors for better user experience
        let errorMessage = "An unexpected error occurred.";
        
        if (error.message === "Invalid login credentials") {
          errorMessage = "Invalid email or password. Admin access only.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes("rate limit")) {
          errorMessage = "Too many login attempts. Please wait a moment and try again.";
        } else {
          errorMessage = error.message;
        }

        toast({
          title: "Access Denied",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Admin Access Granted",
          description: "Welcome to the admin portal.",
        });
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    }

    setIsSigningIn(false);
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
                    Signing In...
                  </>
                ) : (
                  'Sign In to Admin Portal'
                )}
              </Button>
            </form>

          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex flex-col items-center space-y-2">
              <p className="text-xs text-gray-500 text-center">
                For security purposes, all admin access is logged and monitored.
              </p>
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