import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Offline Page Component
 * @description Displayed when the user is offline and the requested page isn't cached
 */
const Offline = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="text-center p-8 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          <WifiOff className="w-10 h-10 text-muted-foreground" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          You're Offline
        </h1>
        
        <p className="text-muted-foreground mb-6">
          It looks like you've lost your internet connection. 
          Some features may not be available until you're back online.
        </p>
        
        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Tip: Previously viewed content may still be available offline.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Offline;
