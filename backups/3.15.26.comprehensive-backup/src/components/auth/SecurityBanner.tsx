import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityBannerProps {
  userType: 'parent' | 'child' | 'general';
  className?: string;
}

export function SecurityBanner({ userType, className = '' }: SecurityBannerProps) {
  const getSecurityMessage = () => {
    switch (userType) {
      case 'parent':
        return {
          icon: <Shield className="h-4 w-4" />,
          title: 'Parent Account Security',
          message: 'As a parent, you have access to family management features. Please keep your login credentials secure.',
          variant: 'default' as const
        };
      case 'child':
        return {
          icon: <Lock className="h-4 w-4" />,
          title: 'Safe & Secure',
          message: 'Your account is protected and monitored by your parents for your safety.',
          variant: 'default' as const
        };
      default:
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Account Security',
          message: 'Please use a strong password and keep your login information private.',
          variant: 'default' as const
        };
    }
  };

  const security = getSecurityMessage();

  return (
    <Alert className={`border-primary/30 bg-primary/5 ${className}`} variant={security.variant}>
      <div className="flex items-center gap-2">
        {security.icon}
        <span className="font-medium text-sm">{security.title}</span>
      </div>
      <AlertDescription className="mt-1 text-xs text-muted-foreground">
        {security.message}
      </AlertDescription>
    </Alert>
  );
}