import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GamesCatalogEmergencyNavProps {
  onRetry?: () => void;
  onSafeMode?: () => void;
  onClearCache?: () => void;
  showDebugOptions?: boolean;
}

export const GamesCatalogEmergencyNav: React.FC<GamesCatalogEmergencyNavProps> = ({
  onRetry,
  onSafeMode,
  onClearCache,
  showDebugOptions = false
}) => {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-orange-800">Having trouble?</h3>
        </div>
        
        <p className="text-orange-700 text-sm mb-4">
          If the Games Catalog isn't loading properly, try these options:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
          
          {onSafeMode && (
            <Button size="sm" variant="outline" onClick={onSafeMode} className="gap-1">
              <Settings className="h-3 w-3" />
              Safe Mode
            </Button>
          )}

          <Button size="sm" variant="outline" asChild className="gap-1">
            <Link to="/">
              <Home className="h-3 w-3" />
              Go Home
            </Link>
          </Button>

          <Button size="sm" variant="outline" onClick={() => window.location.reload()} className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Reload Page
            </Button>
        </div>

        {showDebugOptions && onClearCache && (
          <div className="mt-3 pt-3 border-t border-orange-200">
            <p className="text-xs text-orange-600 mb-2">Debug Options:</p>
            <Button size="sm" variant="ghost" onClick={onClearCache} className="text-xs">
              Clear All Cache
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};