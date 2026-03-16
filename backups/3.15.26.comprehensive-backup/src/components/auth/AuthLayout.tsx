import { Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SecurityBanner } from '@/components/auth/SecurityBanner';

interface AuthLayoutProps {
  children: React.ReactNode;
  description: string;
}

/**
 * Shared layout wrapper for authentication pages.
 * Provides consistent styling, branding, and security banner.
 */
export const AuthLayout = ({ children, description }: AuthLayoutProps) => {
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

        <SecurityBanner userType="general" className="mb-6" />

        <Card className="bg-card/95 backdrop-blur-sm shadow-large border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground">Account Access</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {children}

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
