import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useErrorTracking } from "@/hooks/useErrorTracking";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { secureLog } from "@/utils/secureLogging";

const NotFound = () => {
  const location = useLocation();
  const { logError } = useErrorTracking();

  useEffect(() => {
    // Log 404 error to the system
    logError({
      errorType: '404_not_found',
      severity: 'low',
      message: `User attempted to access non-existent route: ${location.pathname}`,
      componentName: 'NotFound',
      metadata: {
        attempted_path: location.pathname,
        referrer: document.referrer,
        search: location.search,
      }
    });
    
    secureLog.warn('404 Error: User attempted to access non-existent route', { path: location.pathname }, 'NotFound');
  }, [location.pathname, logError]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-6xl font-bold mb-4 text-foreground">404</h1>
          <p className="text-xl text-muted-foreground mb-8">Oops! Page not found</p>
          <p className="text-sm text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-4">
            <Button asChild className="w-full">
              <Link to="/">Return to Home</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/games">Browse Games Catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
