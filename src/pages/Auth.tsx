import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';
import { useAuthLogging } from '@/hooks/useAuthLogging';
import { toast } from '@/hooks/use-toast';
import { Loader2, Heart, Mail, ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { SecurityBanner } from '@/components/auth/SecurityBanner';

type AuthTab = 'signup' | 'signin' | 'forgot-password' | 'reset-confirm';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>('signup');
  const [signupPassword, setSignupPassword] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isPasswordResetSent, setIsPasswordResetSent] = useState(false);
  
  // Reset password confirmation states
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);
  
  const { signUp, signIn, resetPassword } = useAuth();
  const { logActivity, createSession } = useAuthLogging();
  const navigate = useNavigate();
  
  // Set up navigation for auth context
  useAuthNavigation();

  // Handle URL-based tab switching and token validation
  useEffect(() => {
    const tab = searchParams.get('tab') as AuthTab;
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (tab === 'reset-confirm' && accessToken && refreshToken) {
      setActiveTab('reset-confirm');
      setIsCheckingToken(true);
      
      // Set the session with tokens from URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error }) => {
        if (error) {
          console.error('Session setup error:', error);
          toast({
            title: "Invalid Reset Link",
            description: "The password reset link is invalid or expired.",
            variant: "destructive",
          });
          setActiveTab('signin');
        } else {
          setIsValidToken(true);
        }
        setIsCheckingToken(false);
      });
    } else if (tab && ['signup', 'signin', 'forgot-password'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Enhanced error categorization (copied from AdminLogin pattern)
  const getErrorMessage = (error: any): { title: string; description: string } => {
    const message = error?.message || '';
    
    if (message.includes('Invalid login credentials') || message.includes('Invalid credentials')) {
      return {
        title: 'Access Denied',
        description: 'Invalid email or password. Please check your credentials and try again.'
      };
    }
    
    if (message.includes('Too many requests') || message.includes('rate limit')) {
      return {
        title: 'Rate Limited',
        description: 'Too many login attempts. Please wait a moment and try again.'
      };
    }
    
    if (message.includes('Network') || message.includes('fetch')) {
      return {
        title: 'Connection Error',
        description: 'Network error. Please check your internet connection and try again.'
      };
    }
    
    if (message.includes('User already registered')) {
      return {
        title: 'Account Exists',
        description: 'An account with this email already exists. Please sign in instead.'
      };
    }
    
    if (message.includes('Email not confirmed')) {
      return {
        title: 'Email Verification Required',
        description: 'Please check your email and click the verification link to complete your account setup.'
      };
    }
    
    if (message.includes('weak password') || message.includes('password')) {
      return {
        title: 'Password Requirements',
        description: 'Password does not meet security requirements. Please choose a stronger password.'
      };
    }
    
    // Default fallback with original message
    return {
      title: 'Authentication Error',
      description: message || 'An unexpected error occurred. Please try again.'
    };
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signup-email') as string;
    const password = formData.get('signup-password') as string;
    const firstName = formData.get('first-name') as string;
    const lastName = formData.get('last-name') as string;

    try {
      const { error } = await signUp(email, password, firstName, lastName);

      if (error) {
        // Log failed signup attempt
        await logActivity('unknown', 'signup', false, error.message, {
          email,
          firstName,
          lastName,
          errorType: error.name || 'SignupError'
        });
        
        const errorDetails = getErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else {
        // Log successful signup (user ID will be available in auth store)
        toast({
          title: 'Account Created Successfully!',
          description: 'Please check your email to verify your account before signing in.',
        });
        // Switch to sign in tab after successful signup
        setActiveTab('signin');
      }
    } catch (err) {
      const errorDetails = getErrorMessage(err);
      toast({
        title: errorDetails.title,
        description: errorDetails.description,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signin-email') as string;
    const password = formData.get('signin-password') as string;

    try {
      const { error, user } = await signIn(email, password);

      if (error) {
        // Log failed login attempt
        await logActivity('unknown', 'failed_login', false, error.message, {
          email,
          errorType: error.name || 'SigninError',
          attemptedAt: new Date().toISOString()
        });
        
        const errorDetails = getErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else if (user) {
        // Log successful login and create session
        const sessionId = await logActivity(user.id, 'login', true, undefined, {
          email,
          loginMethod: 'email_password',
          loginAt: new Date().toISOString()
        });
        
        if (sessionId) {
          await createSession(user.id);
        }
        
        toast({
          title: 'Welcome Back!',
          description: 'You have been signed in successfully.',
        });
        // Navigation will be handled by useAuthNavigation after role detection
      }
    } catch (err) {
      const errorDetails = getErrorMessage(err);
      toast({
        title: errorDetails.title,
        description: errorDetails.description,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await resetPassword(forgotPasswordEmail, 'user');

      if (error) {
        const errorDetails = getErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else {
        setIsPasswordResetSent(true);
        toast({
          title: 'Password Reset Email Sent',
          description: 'Please check your email for password reset instructions.',
        });
      }
    } catch (err) {
      const errorDetails = getErrorMessage(err);
      toast({
        title: errorDetails.title,
        description: errorDetails.description,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleResetPasswordConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get('new-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;
    
    if (!password || !confirmPassword) {
      toast({
        title: "Fields Required",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update password. Please try again.",
          variant: "destructive",
        });
      } else {
        setIsResetComplete(true);
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated.",
        });
        
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          setActiveTab('signin');
          setIsResetComplete(false);
          setIsValidToken(false);
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">Chatterbox</h1>
          </div>
          <p className="text-white/80">Welcome to our supportive community</p>
        </div>

        {/* Security Banner */}
        <SecurityBanner userType="general" className="mb-6" />

        <Card className="bg-card/95 backdrop-blur-sm shadow-large border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground">Account Access</CardTitle>
            <CardDescription>
              {activeTab === 'forgot-password' 
                ? 'Reset your password' 
                : 'Create an account or sign in to get started'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)} className="w-full">
              {activeTab !== 'forgot-password' && activeTab !== 'reset-confirm' && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                </TabsList>
              )}
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input
                        id="first-name"
                        name="first-name"
                        placeholder="John"
                        required
                        aria-describedby="first-name-help"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input
                        id="last-name"
                        name="last-name"
                        placeholder="Doe"
                        required
                        aria-describedby="last-name-help"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input
                      id="signup-email"
                      name="signup-email"
                      type="email"
                      placeholder="your@example.com"
                      required
                      aria-describedby="signup-email-help"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="signup-password"
                      type="password"
                      placeholder="Create a secure password"
                      required
                      minLength={8}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      aria-describedby="password-requirements"
                    />
                  </div>
                  
                  {/* Password Strength Indicator */}
                  <PasswordStrengthIndicator 
                    password={signupPassword} 
                    className="mt-3"
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account & Setting Up Profile...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email Address</Label>
                    <Input
                      id="signin-email"
                      name="signin-email"
                      type="email"
                      placeholder="your@example.com"
                      required
                      aria-describedby="signin-email-help"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      aria-describedby="signin-password-help"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In & Verifying Access...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  {/* Forgot Password Link */}
                  <div className="text-center pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('forgot-password')}
                      className="text-xs text-primary hover:text-primary-hover"
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="forgot-password">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('signin')}
                      className="p-0 h-auto"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back to Sign In
                    </Button>
                  </div>

                  {!isPasswordResetSent ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email Address</Label>
                        <Input
                          id="forgot-email"
                          name="forgot-email"
                          type="email"
                          placeholder="Enter your email address"
                          required
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          aria-describedby="forgot-email-help"
                        />
                        <p id="forgot-email-help" className="text-xs text-muted-foreground">
                          We'll send you instructions to reset your password
                        </p>
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Reset Instructions...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Reset Instructions
                          </>
                        )}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                        <Mail className="h-8 w-8 text-success mx-auto mb-2" />
                        <h3 className="font-medium text-success mb-1">Email Sent!</h3>
                        <p className="text-sm text-muted-foreground">
                          We've sent password reset instructions to{' '}
                          <span className="font-medium">{forgotPasswordEmail}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsPasswordResetSent(false);
                            setForgotPasswordEmail('');
                          }}
                          className="w-full"
                        >
                          Try Different Email
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setActiveTab('signin')}
                          className="w-full text-xs"
                        >
                          Back to Sign In
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reset-confirm">
                {isCheckingToken ? (
                  <div className="flex flex-col items-center space-y-4 py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying reset link...</p>
                  </div>
                ) : !isValidToken ? (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <Shield className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <h3 className="font-medium text-destructive mb-1">Invalid Reset Link</h3>
                      <p className="text-sm text-muted-foreground">
                        The password reset link is invalid or has expired.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setActiveTab('signin')}
                      className="w-full"
                    >
                      Back to Sign In
                    </Button>
                  </div>
                ) : isResetComplete ? (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                      <h3 className="font-medium text-success mb-1">Password Updated</h3>
                      <p className="text-sm text-muted-foreground">
                        Your password has been successfully updated. Redirecting to sign in...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Shield className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold">Set New Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter your new password below
                      </p>
                    </div>

                    <form onSubmit={handleResetPasswordConfirm} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          name="new-password"
                          type="password"
                          required
                          minLength={8}
                          placeholder="Enter new password (min 8 characters)"
                          aria-describedby="new-password-help"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          name="confirm-password"
                          type="password"
                          required
                          minLength={8}
                          placeholder="Confirm new password"
                          aria-describedby="confirm-password-help"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </form>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Security Notice */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                For security purposes, all login activity is monitored and logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;