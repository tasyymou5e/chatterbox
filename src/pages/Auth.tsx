import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAuthNavigation } from '@/hooks/useAuthNavigation';
import { toast } from '@/hooks/use-toast';
import { Loader2, Heart, Mail, ArrowLeft } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { SecurityBanner } from '@/components/auth/SecurityBanner';

type AuthTab = 'signup' | 'signin' | 'forgot-password' | 'reset-confirm';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>('signup');
  const [signupPassword, setSignupPassword] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isPasswordResetSent, setIsPasswordResetSent] = useState(false);
  const { signUp, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  // Set up navigation for auth context
  useAuthNavigation();

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

    const { error } = await signUp(email, password, firstName, lastName);

    if (error) {
      const errorDetails = getErrorMessage(error);
      toast({
        title: errorDetails.title,
        description: errorDetails.description,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created Successfully!',
        description: 'Please check your email to verify your account before signing in.',
      });
      // Switch to sign in tab after successful signup
      setActiveTab('signin');
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
      const { error } = await signIn(email, password);

      if (error) {
        const errorDetails = getErrorMessage(error);
        toast({
          title: errorDetails.title,
          description: errorDetails.description,
          variant: 'destructive',
        });
      } else {
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

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">Spectrum Harmony</h1>
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