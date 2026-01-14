import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuthNavigation } from '@/hooks/useAuthNavigation';
import {
  AuthLayout,
  SignUpForm,
  SignInForm,
  ForgotPasswordForm,
  ResetPasswordConfirmForm,
  ChildSignupForm,
} from '@/components/auth';

type AuthTab = 'signup' | 'signin' | 'forgot-password' | 'reset-confirm' | 'child-signup';

/**
 * Main authentication page component.
 * Handles routing between signup, signin, password reset, and child signup flows.
 */
const Auth = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AuthTab>('signup');
  const [childAccountCode, setChildAccountCode] = useState('');
  const { settings } = useSiteSettings();
  
  // Set up navigation for auth context
  useAuthNavigation();

  // Handle URL-based tab switching
  useEffect(() => {
    const tab = searchParams.get('tab') as AuthTab;
    const code = searchParams.get('code');
    
    if (tab === 'child-signup' && code) {
      setActiveTab('child-signup');
      setChildAccountCode(code);
    } else if (tab === 'reset-confirm') {
      setActiveTab('reset-confirm');
    } else if (tab && ['signup', 'signin', 'forgot-password', 'child-signup'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const getDescription = () => {
    switch (activeTab) {
      case 'forgot-password':
        return 'Reset your password';
      case 'child-signup':
        return 'Complete your child account setup';
      case 'reset-confirm':
        return 'Set your new password';
      default:
        return 'Create an account or sign in to get started';
    }
  };

  return (
    <AuthLayout description={getDescription()}>
      {/* Parent Signup Disabled Notice */}
      {!settings.parent_signup_enabled && activeTab === 'signup' && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center space-x-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Parent Signup Temporarily Disabled</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            New parent signups are currently disabled. If you already have an account, you can still sign in. 
            Please contact support if you need assistance.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)} className="w-full">
        {activeTab !== 'forgot-password' && activeTab !== 'reset-confirm' && activeTab !== 'child-signup' && (
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signup" disabled={!settings.parent_signup_enabled}>
              Sign Up {!settings.parent_signup_enabled && '(Disabled)'}
            </TabsTrigger>
            <TabsTrigger value="signin">Sign In</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="signup">
          <SignUpForm
            isSignupEnabled={settings.parent_signup_enabled}
            onSignUpSuccess={() => setActiveTab('signin')}
          />
        </TabsContent>

        <TabsContent value="signin">
          <SignInForm
            onForgotPassword={() => setActiveTab('forgot-password')}
            onChildSignup={() => setActiveTab('child-signup')}
          />
        </TabsContent>

        <TabsContent value="forgot-password">
          <ForgotPasswordForm onBackToSignIn={() => setActiveTab('signin')} />
        </TabsContent>

        <TabsContent value="reset-confirm">
          <ResetPasswordConfirmForm onBackToSignIn={() => setActiveTab('signin')} />
        </TabsContent>

        <TabsContent value="child-signup">
          <ChildSignupForm
            initialCode={childAccountCode}
            onBackToSignIn={() => setActiveTab('signin')}
          />
        </TabsContent>
      </Tabs>
    </AuthLayout>
  );
};

export default Auth;
